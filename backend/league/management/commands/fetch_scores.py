import os
from datetime import datetime, timezone

import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone as tz

from league.models import Team, Game


class Command(BaseCommand):
    help = 'Fetch fixtures and standings from API-Football'

    def handle(self, *args, **options):
        api_key = settings.API_FOOTBALL_KEY
        if not api_key:
            self.stdout.write(self.style.ERROR('API_FOOTBALL_KEY not set'))
            return

        league_id = settings.API_FOOTBALL_LEAGUE_ID
        season = settings.API_FOOTBALL_SEASON
        headers = {'x-apisports-key': api_key}
        base = 'https://v3.football.api-sports.io'

        self._fetch_fixtures(base, headers, league_id, season)
        self._fetch_standings(base, headers, league_id, season)
        self.stdout.write(self.style.SUCCESS('Sync complete'))

    def _api_get(self, url, headers, params):
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            if data.get('errors') and data['errors']:
                self.stdout.write(self.style.WARNING(f"API errors: {data['errors']}"))
                return None
            return data.get('response', [])
        except requests.RequestException as e:
            self.stdout.write(self.style.ERROR(f"Request failed: {e}"))
            return None

    def _get_or_create_team(self, team_data):
        api_id = team_data['id']
        team, created = Team.objects.get_or_create(
            api_id=api_id,
            defaults={
                'name': team_data['name'],
                'code': team_data.get('code', ''),
                'flag_url': team_data.get('logo', ''),
                'country_code': '',
            },
        )
        if not created:
            changed = False
            if team.name != team_data['name']:
                team.name = team_data['name']
                changed = True
            code = team_data.get('code', '')
            if code and team.code != code:
                team.code = code
                changed = True
            logo = team_data.get('logo', '')
            if logo and team.flag_url != logo:
                team.flag_url = logo
                changed = True
            if changed:
                team.save()
        return team

    def _fetch_fixtures(self, base, headers, league_id, season):
        self.stdout.write('Fetching fixtures...')
        fixtures = self._api_get(
            f'{base}/fixtures',
            headers,
            {'league': league_id, 'season': season},
        )
        if fixtures is None:
            return

        for f in fixtures:
            fixture = f['fixture']
            teams = f['teams']
            goals = f['goals']
            status = fixture['status']['short']

            home_team = self._get_or_create_team(teams['home'])
            away_team = self._get_or_create_team(teams['away'])

            date_str = fixture['date']
            try:
                date_dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except ValueError:
                date_dt = tz.now()

            mapped_status = 'scheduled'
            if status in ('FT', 'AET', 'PEN'):
                mapped_status = 'finished'
            elif status == 'LIVE':
                mapped_status = 'live'
            elif status in ('HT', 'ET', 'BT', 'INT'):
                mapped_status = 'live'
            elif status in ('NS', 'TBD'):
                mapped_status = 'scheduled'

            stage_raw = fixture.get('stage', '')
            round_raw = fixture.get('round', '')

            Game.objects.update_or_create(
                api_fixture_id=fixture['id'],
                defaults={
                    'home_team': home_team,
                    'away_team': away_team,
                    'home_score': goals.get('home'),
                    'away_score': goals.get('away'),
                    'status': mapped_status,
                    'date': date_dt,
                    'stage': stage_raw,
                    'round': round_raw,
                    'venue': fixture.get('venue', {}).get('name', ''),
                },
            )

        self.stdout.write(f"  Synced {len(fixtures)} fixtures")

    def _fetch_standings(self, base, headers, league_id, season):
        self.stdout.write('Fetching standings...')
        standings_data = self._api_get(
            f'{base}/standings',
            headers,
            {'league': league_id, 'season': season},
        )
        if standings_data is None:
            return

        knockout_seen = False

        for league_entry in standings_data:
            standings_list = league_entry.get('standings', [])
            for group_standings in standings_list:
                for entry in group_standings:
                    team_data = entry['team']
                    api_id = team_data['id']

                    team = self._get_or_create_team(team_data)

                    group_name = (entry.get('group') or '').replace('Group ', '')
                    description = entry.get('description', '')
                    if description and 'knockout' in description.lower():
                        knockout_seen = True

                    team.group_name = group_name if not knockout_seen else None
                    team.points = int(entry.get('points', 0))
                    team.played = int(entry.get('played', 0))
                    team.wins = int(entry.get('win', 0))
                    team.draws = int(entry.get('draw', 0))
                    team.losses = int(entry.get('lose', 0))
                    team.goals_for = int(entry.get('goals', {}).get('for', 0))
                    team.goals_against = int(entry.get('goals', {}).get('against', 0))
                    team.goal_diff = int(entry.get('goalsDiff', 0))
                    team.group_position = int(entry.get('rank', 0))
                    team.tournament_stage = 'knockout' if knockout_seen else 'group'
                    team.save()

        self.stdout.write(f'  Standings updated')

        if not knockout_seen:
            self._update_knockout_teams(base, headers, league_id, season)

    def _update_knockout_teams(self, base, headers, league_id, season):
        fixtures = self._api_get(
            f'{base}/fixtures',
            headers,
            {'league': league_id, 'season': season, 'status': 'FT'},
        )
        if fixtures is None:
            return

        advanced = set()
        for f in fixtures:
            fixture = f['fixture']
            round_raw = fixture.get('round', '')
            if round_raw in ('Group Stage', 'Group A', 'Group B', 'Group C', 'Group D',
                             'Group E', 'Group F', 'Group G', 'Group H'):
                continue
            goals = f['goals']
            if goals.get('home') is not None and goals.get('away') is not None:
                if goals['home'] > goals['away']:
                    advanced.add(f['teams']['home']['id'])
                elif goals['away'] > goals['home']:
                    advanced.add(f['teams']['away']['id'])
                elif fixture['status']['short'] == 'PEN':
                    penalty = fixture.get('score', {}).get('penalty', {})
                    if penalty.get('home') is not None:
                        if penalty['home'] > penalty['away']:
                            advanced.add(f['teams']['home']['id'])
                        else:
                            advanced.add(f['teams']['away']['id'])

        Team.objects.filter(
            tournament_stage='group',
            group_position__isnull=False,
        ).update(tournament_stage='knockout')

        teams_in_knockout = Team.objects.filter(api_id__in=list(advanced))
        for team in teams_in_knockout:
            team.group_name = None
            team.tournament_stage = 'knockout'
            team.save()

        self.stdout.write(f'  Updated knockout teams: {len(advanced)} teams advanced')
