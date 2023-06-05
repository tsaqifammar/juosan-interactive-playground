from django.views.decorators.http import require_http_methods
from django.http import HttpRequest, JsonResponse, HttpResponse
from django.shortcuts import render
from core.lib.solver import Solver
import json

# Create your views here.
@require_http_methods(["GET"])
def index(request: HttpRequest):
  return render(request, "core/index.html", {})

@require_http_methods(["POST"])
def solve(request: HttpRequest):
  body = json.loads(request.body.decode('utf-8'))
  # TODO: Add validate if input is valid in body
  solver = Solver(**body)
  val = solver.solve()
  return JsonResponse(val)
