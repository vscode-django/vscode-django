from django.urls import path

from . import views

app_name = "app"

urlpatterns = [
    path("", views.index, name="index"),
    path("<int:pk>/", views.detail, name="detail"),
]
