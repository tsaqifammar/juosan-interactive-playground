from django.urls import path
from . import views

app_name = "core"
urlpatterns = [
  path("", views.index, name="index"),
  path("solve", views.solve, name="solve"),
  path("validate", views.validate, name="validate"),
]
