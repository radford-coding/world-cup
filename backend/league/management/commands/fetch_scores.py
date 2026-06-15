from datetime import datetime

import requests
from django.core.management.base import BaseCommand
from django.utils import timezone

from league.models import Team, Game


API_BASE = 'https://worldcup26.ir'


class Command(BaseCommand):
    help = 'Fetch scores and standings from worldcup26.ir (free 2026 WC API)'

    def handle(self, *args, **options):
        self.stdout.write('Fetching from worldcup26.ir...')
        teams_map = self._build_teams_map()
        if teams_map is None:
            return
        self._fetch_games(teams_map)
        self._fetch_standings(teams_map)
        self.stdout.write(self.style.SUCCESS('Sync complete'))

    def _api_get(self, path):
        try:
            resp = requests.get(
                f'{API_BASE}{path}',
                timeout=15,
                headers={'User-Agent': 'WorldCupLeague/1.0'},
            )
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict) and 'msg' in data and 'error' in str(data.get('msg', '')).lower():
                self.stdout.write(self.style.WARNING(f'API error: {data["msg"]}'))
                return None
            return data
        except requests.RequestException as e:
            self.stdout.write(self.style.ERROR(f'Request failed: {e}'))
            return None

    def _build_teams_map(self):
        data = self._api_get('/get/teams')
        if not data:
            return {}
        teams_list = data if isinstance(data, list) else data.get('teams', data) or []
        result = {}
        for t in teams_list:
            name = t.get('name_en', '')
            tid = str(t.get('id', ''))
            result[name] = {'api_id': tid, 'group': t.get('groups', '')}
            result[tid] = name
        self.stdout.write(f'  Loaded {len([k for k in result if k.isalpha()])} team names')
        return result

    def _team_by_name(self, name, teams_map):
        if not name or name not in teams_map:
            return None
        try:
            return Team.objects.get(name=name)
        except Team.DoesNotExist:
            return None

    def _parse_datetime(self, date_str):
        try:
            dt = datetime.strptime(date_str, '%m/%d/%Y %H:%M')
            return timezone.make_aware(dt)
        except (ValueError, TypeError):
            return None

    def _fetch_games(self, teams_map):
        self.stdout.write('Fetching games...')
        data = self._api_get('/get/games')
        if not data:
            return

        games = data if isinstance(data, list) else data.get('games', data) or []
        updated = 0
        skipped = 0

        for g in games:
            home_name = g.get('home_team_name_en', '')
            away_name = g.get('away_team_name_en', '')
            home_team = self._team_by_name(home_name, teams_map)
            away_team = self._team_by_name(away_name, teams_map)
            if not home_team or not away_team:
                skipped += 1
                continue

            finished = (g.get('finished') or '').upper() == 'TRUE'
            time_elapsed = (g.get('time_elapsed') or '').lower()
            if finished:
                status = 'finished'
            elif time_elapsed in ('live', '1h', '2h', 'ht', 'et', 'int'):
                status = 'live'
            else:
                status = 'scheduled'

            home_score = g.get('home_score')
            away_score = g.get('away_score')
            try:
                home_score = int(home_score) if home_score not in (None, '', 'null') else None
                away_score = int(away_score) if away_score not in (None, '', 'null') else None
            except (ValueError, TypeError):
                home_score = None
                away_score = None

            date_dt = self._parse_datetime(g.get('local_date'))
            if not date_dt:
                date_dt = timezone.now()

            stage = g.get('type', '')
            group = g.get('group', '')
            round_raw = f"Group {group}" if stage == 'group' else stage

            try:
                api_id = int(g['id'])
            except (ValueError, TypeError):
                skipped += 1
                continue

            Game.objects.update_or_create(
                api_fixture_id=api_id,
                defaults={
                    'home_team': home_team,
                    'away_team': away_team,
                    'home_score': home_score,
                    'away_score': away_score,
                    'status': status,
                    'date': date_dt,
                    'stage': stage,
                    'round': round_raw,
                    'venue': '',
                },
            )
            updated += 1

        self.stdout.write(f'  {updated} games synced ({skipped} skipped)')

    def _fetch_standings(self, teams_map):
        self.stdout.write('Fetching standings...')
        data = self._api_get('/get/groups')
        if not data:
            return

        groups_data = data if isinstance(data, list) else data.get('groups', data) or []
        updated = 0

        for group in groups_data:
            group_name = group.get('name', '')
            for entry in group.get('teams', []):
                team_id = str(entry.get('team_id', ''))
                team_name = teams_map.get(team_id, '')
                if not team_name:
                    continue

                team = self._team_by_name(team_name, teams_map)
                if not team:
                    self.stdout.write(self.style.WARNING(f'  Team not found: "{team_name}"'))
                    continue

                try:
                    mp = int(entry.get('mp', 0))
                    w = int(entry.get('w', 0))
                    d = int(entry.get('d', 0))
                    l = int(entry.get('l', 0))
                    pts = int(entry.get('pts', 0))
                    gf = int(entry.get('gf', 0))
                    ga = int(entry.get('ga', 0))
                    gd = int(entry.get('gd', 0))
                    pos = int(entry.get('position', entry.get('pos', 0)))
                except (ValueError, TypeError):
                    continue

                team.group_name = group_name
                team.points = pts
                team.played = mp
                team.wins = w
                team.draws = d
                team.losses = l
                team.goals_for = gf
                team.goals_against = ga
                team.goal_diff = gd
                team.group_position = pos
                team.tournament_stage = 'group'
                team.save()
                updated += 1

        self.stdout.write(f'  {updated} team standings updated')
