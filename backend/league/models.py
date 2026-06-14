from django.db import models


class Person(models.Model):
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Team(models.Model):
    api_id = models.IntegerField(unique=True)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, blank=True, default='')
    flag_url = models.URLField(blank=True, default='')
    country_code = models.CharField(max_length=2, blank=True, default='')
    group_name = models.CharField(max_length=10, blank=True, null=True)
    points = models.IntegerField(default=0)
    played = models.IntegerField(default=0)
    wins = models.IntegerField(default=0)
    draws = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)
    goals_for = models.IntegerField(default=0)
    goals_against = models.IntegerField(default=0)
    goal_diff = models.IntegerField(default=0)
    group_position = models.IntegerField(null=True, blank=True)
    tournament_stage = models.CharField(max_length=50, default='group')

    class Meta:
        ordering = ['group_name', 'group_position', 'name']

    def __str__(self):
        return self.name


class Game(models.Model):
    api_fixture_id = models.IntegerField(unique=True)
    home_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='home_games')
    away_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='away_games')
    home_score = models.IntegerField(null=True, blank=True)
    away_score = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=50, default='scheduled')
    date = models.DateTimeField()
    stage = models.CharField(max_length=100, blank=True, default='')
    round = models.CharField(max_length=100, blank=True, default='')
    venue = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.home_team} vs {self.away_team}"


class PersonTeam(models.Model):
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='person_teams')
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='team_persons')

    class Meta:
        unique_together = ('person', 'team')

    def __str__(self):
        return f"{self.person.name} - {self.team.name}"
