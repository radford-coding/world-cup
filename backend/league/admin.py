from django.contrib import admin
from .models import Person, Team, Game, PersonTeam


@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ['name']


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'group_name', 'group_position', 'points', 'tournament_stage']
    list_filter = ['group_name', 'tournament_stage']
    search_fields = ['name']


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ['home_team', 'home_score', 'away_score', 'away_team', 'date', 'stage', 'status']
    list_filter = ['stage', 'status']
    date_hierarchy = 'date'


@admin.register(PersonTeam)
class PersonTeamAdmin(admin.ModelAdmin):
    list_display = ['person', 'team']
    list_filter = ['person']
