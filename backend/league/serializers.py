from rest_framework import serializers
from .models import Person, Team, Game, PersonTeam


class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ['id', 'name']


class TeamSerializer(serializers.ModelSerializer):
    persons = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            'id', 'api_id', 'name', 'code', 'flag_url', 'country_code',
            'group_name', 'points', 'played', 'wins', 'draws', 'losses',
            'goals_for', 'goals_against', 'goal_diff', 'group_position',
            'tournament_stage', 'persons',
        ]

    def get_persons(self, obj):
        return [
            {'id': pt.person.id, 'name': pt.person.name}
            for pt in obj.team_persons.all()
        ]


class GameSerializer(serializers.ModelSerializer):
    home_team = TeamSerializer()
    away_team = TeamSerializer()

    class Meta:
        model = Game
        fields = [
            'id', 'api_fixture_id', 'home_team', 'away_team',
            'home_score', 'away_score', 'status', 'date', 'stage', 'round', 'venue',
        ]


class PersonStandingSerializer(serializers.Serializer):
    person = PersonSerializer()
    total_points = serializers.IntegerField()
    teams = serializers.ListField(child=serializers.DictField())
