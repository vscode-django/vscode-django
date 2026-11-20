from django.urls import include, path

from . import views

urlpatterns = [
    path("detail/", views.detail, name="detail"),
    path("app/", include("app.urls")),
]
