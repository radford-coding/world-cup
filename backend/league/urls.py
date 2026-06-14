from django.urls import path
from . import views

urlpatterns = [
    path('games/', views.GamesView.as_view(), name='games'),
    path('teams/', views.TeamsView.as_view(), name='teams'),
    path('standings/', views.StandingsView.as_view(), name='standings'),
]
