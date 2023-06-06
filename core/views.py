from django.views.decorators.http import require_http_methods
from django.http import HttpRequest, JsonResponse, HttpResponseBadRequest
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

  for key in ["m", "n", "r", "N", "R"]:
    if not (key in body):
      return HttpResponseBadRequest("The keys m, n, r, N, and R must all be included.")

  solver = Solver(**body)
  val = solver.solve()
  return JsonResponse(val)
