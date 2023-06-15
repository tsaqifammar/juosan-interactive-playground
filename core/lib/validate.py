
def validate_solution(m, n, r, N, R, S):
  # Check numerical constraints within territories
  bad_territories = []
  D = [0 for _ in range(r)]
  P = [0 for _ in range(r)]
  for i in range(m):
    for j in range(n):
      if S[i][j] == '-':
        D[R[i][j]] += 1
      else:
        P[R[i][j]] += 1
  
  for t in range(r):
    if N[t] != -1 and D[t] != N[t] and P[t] != N[t]:
      bad_territories.append(t)

  # Check for three consecutive cells
  bad_cells = set()
  for i in range(m - 2):
    for j in range(n):
      if S[i][j] == S[i+1][j] == S[i+2][j] == '-':
        bad_cells.update([(i,j), (i+1,j), (i+2,j)])
  
  for i in range(m):
    for j in range(n - 2):
      if S[i][j] == S[i][j+1] == S[i][j+2] == '|':
        bad_cells.update([(i,j), (i,j+1), (i,j+2)])
  
  empty_cells = [(i,j) for i in range(m) for j in range(n) if S[i][j] == '']
  return {
    "correct": len(bad_territories) == len(bad_cells) == len(empty_cells) == 0,
    "bad_territories": bad_territories,
    "bad_cells": list(bad_cells),
    "empty_cells": empty_cells,
  }
