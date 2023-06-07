from pysat.solvers import Glucose3
from pysat.card import CardEnc

def distribute(v, formula):
  return [clause + [v] for clause in formula]

class Solver:
  def __init__(self, m, n, r, N, R):
    self.m = m
    self.n = n
    self.r = r
    self.N = N
    self.R = R
    self.region_cells = {region: [] for region in range(r)}
    for i in range(m):
      for j in range(n):
        self.region_cells[R[i][j]].append(self.J(i,j))
  
  def J(self, i, j):
    return i*self.n + j + 1
  
  def solve_tractable_less_than_3(self):
    S = [[None for j in range(self.n)] for i in range(self.m)]

    WIN_SYMBOL = '-' if self.m <= 2 else '|'
    LOSE_SYMBOL = '|' if self.m <= 2 else '-'

    vis = [False for _ in range(self.r)]
    D = [0 for _ in range(self.r)]
    P = [0 for _ in range(self.r)]

    def valid(i, j):
      return i >= 0 and i < self.m and j >= 0 and j < self.n

    for i in range(self.m):
      for j in range(self.n):
        if not vis[self.R[i][j]]:
          S[i][j] = WIN_SYMBOL
          vis[self.R[i][j]] = True
        else:
          adj_x, adj_y = None, None
          for tmp_x, tmp_y in [[i - 1, j], [i, j - 1]]:
            if valid(tmp_x, tmp_y) and S[tmp_x][tmp_y] != None and self.R[i][j] == self.R[tmp_x][tmp_y]:
              adj_x, adj_y = tmp_x, tmp_y
              break

          assert(adj_x != None)
          S[i][j] = '-' if S[adj_x][adj_y] == '|' else '|'

        if S[i][j] == '-':
          D[self.R[i][j]] += 1
        else:
          P[self.R[i][j]] += 1
    
    to_change = [0 for _ in range(self.r)]
    for t in range(self.r):
      if self.N[t] == -1: continue
      win_count = D[t] if WIN_SYMBOL == '-' else P[t]
      lose_count = P[t] if WIN_SYMBOL == '-' else D[t]
      to_change[t] = self.N[t]-win_count if self.N[t] > win_count else lose_count-self.N[t]

    for i in range(self.m):
      for j in range(self.n):
        if to_change[self.R[i][j]] > 0 and S[i][j] == LOSE_SYMBOL:
          S[i][j] = WIN_SYMBOL
          to_change[self.R[i][j]] -= 1
    
    return {
      "is_solvable": True,
      "solution": S,
    }

  def solve_tractable_no_constraint(self):
    return {
      "is_solvable": True,
      "solution": [
        ['-' if (i + j) % 2 == 0 else '|' for j in range(self.n)]
        for i in range(self.m)
      ],
    }

  def solve_with_sat(self):
    solver = Glucose3()

    # Configure rule three vertically consecutive
    for i in range(self.m - 2):
      for j in range(self.n):
        solver.add_clause([-self.J(i,j), -self.J(i+1,j), -self.J(i+2,j)])

    # Configure rule three horizontally consecutive
    for i in range(self.m):
      for j in range(self.n - 2):
        solver.add_clause([self.J(i,j), self.J(i,j+1), self.J(i,j+2)])

    prev_top = self.J(self.m - 1, self.n - 1)

    # Configure territory rules
    for i in range(self.r):
      if self.N[i] != -1:
        h = prev_top + 1
        dashEqual = CardEnc.equals(
          lits=self.region_cells[i],
          bound=self.N[i],
          top_id=h
        )
        dashEqualWithH = distribute(h, dashEqual.clauses)
        solver.append_formula(
          formula=dashEqualWithH,
          no_return=False
        )
        
        barEqual = CardEnc.equals(
          lits=self.region_cells[i],
          bound=len(self.region_cells[i])-self.N[i],
          top_id=max(dashEqual.nv, h)
        )
        barEqualWithNegH = distribute(-h, barEqual.clauses)
        solver.append_formula(
          formula=barEqualWithNegH,
          no_return=False
        )

        prev_top = max(barEqual.nv, h)

    # Running the SAT solver
    sat = solver.solve()

    if sat:
      solution = solver.get_model()
      def var_is_true(x):
        l, r = 0, len(solution) - 1
        while l <= r:
          mid = (l+r)//2
          if abs(solution[mid]) == x:
            return solution[mid] > 0
          elif abs(solution[mid]) > x:
            r = mid - 1
          else:
            l = mid + 1

      S = [[0 for j in range(self.n)] for i in range(self.m)]
      for i in range(self.m):
        for j in range(self.n):
          S[i][j] = "-" if var_is_true(self.J(i,j)) else "|"

      return {
        "is_solvable": True,
        "solution": S,
      }
    else:
      return {
        "is_solvable": False,
        "solution": [],
      }
  
  def solve(self):
    if self.m <= 2 or self.n <= 2:
      return self.solve_tractable_less_than_3()
    elif all(c == -1 for c in self.N):
      return self.solve_tractable_no_constraint()
    else:
      return self.solve_with_sat()
