/* Const */
const MINMAX_SIZE = [1, 50];
const DIRS = {
  "Top": [-1, 0],
  "Left": [0, -1],
  "Bottom": [1, 0],
  "Right": [0, 1],
};
const NO_WALL_STYLE = "dashed 1px lightgray";
const WALL_STYLE = "solid 1px black";
const TOOLS = {
  ADD_TERRITORY: "add-territory",
  ADD_CONSTRAINT: "add-constraint",
}

/* Tracked states */
let m = 5, n = 5, r = 1;
let territoryNums = Array.from(Array(5), _ => Array(5).fill(0));
let constraintNumbers = { 0: -1 };
let cellDivs = [];
let messageDiv = document.getElementById("message");
let selectedTool = "";

// States for "add territory" tool
let cornersSelected = null;
function resetAddTerritoryStates() {
  if (cornersSelected !== null) {
    const [i, j] = cornersSelected;
    cellDivs[i][j].style.removeProperty("background-color");
  }
  cornersSelected = null;
}

// States for "add constraint" tool
let currentConstraintNumber = 1;

// states undo
let changesHistory = []; // { onUndo: () => {} } where onUndo is executed when popped

/* ============== Tool widgets =============== */

function setupPuzzleSizeSettingsWidget() {
  // Puzzle size settings
  const mInput = document.getElementById("m");
  const nInput = document.getElementById("n");
  const gridDiv = document.getElementById("grid");
  mInput.addEventListener("change", (e) => {
    if (e.target.value) {
      e.target.value = clamp(e.target.value, MINMAX_SIZE[0], MINMAX_SIZE[1]);
      m = Number(e.target.value);
      generateInitialGrid();
    }
  });
  nInput.addEventListener("change", (e) => {
    if (e.target.value) {
      e.target.value = clamp(e.target.value, MINMAX_SIZE[0], MINMAX_SIZE[1]);
      n = Number(e.target.value);
      gridDiv.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
      generateInitialGrid();
    }
  });
}

function setupTools() {
  const handleToolChange = (toolName) => {
    if (toolName === TOOLS.ADD_TERRITORY) {
      selectedTool = TOOLS.ADD_TERRITORY;
      messageDiv.textContent = "Pick two opposite corners of the territory to create.";
    } else {
      selectedTool = TOOLS.ADD_CONSTRAINT;
      resetAddTerritoryStates();
    }
  }
  document.getElementById("add-territory").addEventListener("change", (e) => handleToolChange(e.target.value));
  document.getElementById("add-constraint").addEventListener("change", (e) => handleToolChange(e.target.value));
}

function setupToolWidgets() {
  setupPuzzleSizeSettingsWidget();
  setupTools();
}

/* =========================================== */

function handleClick(i, j) {
  if (selectedTool === TOOLS.ADD_TERRITORY) {
    if (cornersSelected === null) {
      cellDivs[i][j].style.backgroundColor = "green";
      cornersSelected = [i, j];
    } else {
      const [i2, j2] = cornersSelected;
      for (let x = Math.min(i,i2); x <= Math.max(i,i2); x++)
        for (let y = Math.min(j,j2); y <= Math.max(j,j2); y++)
          territoryNums[x][y] = r;
      recalculateTerritories();
      drawTerritories();
      resetAddTerritoryStates();
    }
  } else {
    ;
  }
}

function generateInitialGrid() {
  cellDivs = [];
  territoryNums = Array.from(Array(m), _ => Array(n).fill(0));

  const gridDiv = document.getElementById("grid");
  gridDiv.replaceChildren();
  for (let i = 0; i < m; i++) {
    let currentRow = [];
    for (let j = 0; j < n; j++) {
      const cellDiv = document.createElement("div");
      cellDiv.classList.add("cell");
      cellDiv.classList.add("door-cell-top");
      cellDiv.id = `cell-${i}-${j}`;
      cellDiv.addEventListener("click", () => handleClick(i, j));
      gridDiv.appendChild(cellDiv);
      currentRow.push(cellDiv);
    }
    cellDivs.push(currentRow);
  }
  drawTerritories();
}

function recalculateTerritories() {
  let vis = {};
  function dfs(i, j, num) {
    vis[[i,j]] = true;
    for (const dir in DIRS) {
      const [dx, dy] = DIRS[dir];
      let adjI = i + dx, adjJ = j + dy;
      if (validCell(adjI, adjJ) && !vis[[adjI,adjJ]] && territoryNums[i][j] == territoryNums[adjI][adjJ])
        dfs(adjI, adjJ, num);
    }
    territoryNums[i][j] = num;
  }

  let currentTerritoryNum = 0;
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      if (!vis[[i,j]])
        dfs(i, j, currentTerritoryNum++);
  r = currentTerritoryNum;
}

function drawTerritories() {
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (const [dirLabel, [dx, dy]] of Object.entries(DIRS)) {
        let adjI = i + dx, adjJ = j + dy;
        let validButDifferentTerritory = validCell(adjI, adjJ) && territoryNums[i][j] != territoryNums[adjI][adjJ];
        if (!validCell(adjI, adjJ) || validButDifferentTerritory)
          cellDivs[i][j].style[`border${dirLabel}`] = WALL_STYLE;
        else
          cellDivs[i][j].style[`border${dirLabel}`] = NO_WALL_STYLE;
      }
}

function main() {
  setupToolWidgets();
  generateInitialGrid();
  drawTerritories();
}

main();

/* ======= utils ========= */

function clamp(num, min, max) { return Math.min(Math.max(num, min), max); }
function validCell(x, y) { return x >= 0 && x < m && y >= 0 && y < n; }
