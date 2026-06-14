from datetime import date, datetime, timezone
from collections import defaultdict

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Person, Team, Game, PersonTeam
from .serializers import GameSerializer, TeamSerializer


class GamesView(APIView):
    def get(self, request):
        date_str = request.query_params.get('date', date.today().isoformat())
        try:
            query_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        games = Game.objects.filter(
            date__date=query_date,
        ).select_related(
            'home_team', 'away_team',
        ).prefetch_related(
            'home_team__team_persons__person',
            'away_team__team_persons__person',
        ).order_by('date')

        serializer = GameSerializer(games, many=True)
        return Response(serializer.data)


class TeamsView(APIView):
    def get(self, request):
        groups_teams = Team.objects.exclude(
            group_name__isnull=True,
        ).exclude(
            group_name='',
        ).prefetch_related(
            'team_persons__person',
        ).order_by('group_name', 'group_position')

        if groups_teams.exists():
            groups = defaultdict(list)
            for team in groups_teams:
                groups[team.group_name].append(team)
            result = {
                'stage': 'group',
                'groups': {
                    group_name: TeamSerializer(teams, many=True).data
                    for group_name, teams in sorted(groups.items())
                },
            }
        else:
            knockout_rounds = ['Round of 16', 'Quarter-finals', 'Semi-finals', 'Final']
            rounds_data = {}
            for round_name in knockout_rounds:
                games = Game.objects.filter(
                    round=round_name,
                ).select_related(
                    'home_team', 'away_team',
                ).prefetch_related(
                    'home_team__team_persons__person',
                    'away_team__team_persons__person',
                ).order_by('date')
                if games.exists():
                    rounds_data[round_name] = GameSerializer(games, many=True).data
            result = {
                'stage': 'knockout',
                'rounds': rounds_data,
            }

        return Response(result)


class StandingsView(APIView):
    def get(self, request):
        people = Person.objects.prefetch_related(
            'person_teams__team',
        ).all()

        standings = []
        for person in people:
            teams_data = []
            total_points = 0
            for pt in person.person_teams.all():
                team = pt.team
                team_points = (team.wins * 3) + (team.draws * 1)
                total_points += team_points

                position_display = self._position_display(team)
                teams_data.append({
                    'id': team.id,
                    'name': team.name,
                    'code': team.code,
                    'flag_url': team.flag_url,
                    'country_code': team.country_code,
                    'points': team.points,
                    'group_name': team.group_name,
                    'group_position': team.group_position,
                    'tournament_stage': team.tournament_stage,
                    'team_points': team_points,
                    'position_display': position_display,
                })

            teams_data.sort(key=lambda t: t['team_points'], reverse=True)
            standings.append({
                'person': {'id': person.id, 'name': person.name},
                'total_points': total_points,
                'teams': teams_data,
            })

        standings.sort(key=lambda s: s['total_points'], reverse=True)
        return Response(standings)

    def _position_display(self, team):
        if team.tournament_stage == 'group':
            if team.group_position:
                return f"Group {team.group_name} - {self._ordinal(team.group_position)}"
            return f"Group {team.group_name}"
        if team.tournament_stage == 'knockout':
            return 'Eliminated'
        return team.tournament_stage

    def _ordinal(self, n):
        return f"{n}{'th' if 11 <= n <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"
