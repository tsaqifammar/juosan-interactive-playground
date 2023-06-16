/* Const */
const MINMAX_SIZE = [1, 25];
const GRID_WIDTH = { 1: "20%", 10: "40%", 20: "50%", 30: "75%", 40: "90%" };
const FONT_SIZE = { 1: "medium", 10: "small", 20: "x-small", 30: "x-small", 40: "xx-small" }
const DIRS = { "Top": [-1, 0], "Left": [0, -1], "Bottom": [1, 0], "Right": [0, 1] };
const NO_WALL_STYLE = "dashed 1px var(--gray-300)";
const WALL_STYLE = "solid 2px var(--gray-900)";
const TOOLS = { ADD_TERRITORY: "add-territory", ADD_CONSTRAINT: "add-constraint" }
const BAR_CLASS = "cell-bar", DASH_CLASS = "cell-dash";
const BAD_CELL = "bad-cell", BAD_TERRITORY = "bad-territory", EMPTY_CELL = "empty";

/* Tracked states */
let m = 5, n = 5, r = 1;
let territoryNums = Array.from(Array(5), _ => Array(5).fill(0));
let territorySizes = { 0: m*n };
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
let topCornerTerritories = { 0: [0, 0] };
function setEditables(value) {
  for (const [x, y] of Object.values(topCornerTerritories))
    cellDivs[x][y].getElementsByTagName("p")[0].contentEditable = value;
}

let currentlyHoveredTerritory = -1;
const CELL_HIGHLIGHTED_CLASS = "cell-highlighted";

function highlightRegion(x, y, highlight, t) {
  if (highlight)
    cellDivs[x][y].classList.add(CELL_HIGHLIGHTED_CLASS);
  else
    cellDivs[x][y].classList.remove(CELL_HIGHLIGHTED_CLASS);
  for (const dir in DIRS) {
    const [dx, dy] = DIRS[dir];
    let adjI = x + dx, adjJ = y + dy;
    if (
      validCell(adjI, adjJ) &&
      territoryNums[adjI][adjJ] === t &&
      (
        highlight && !cellDivs[adjI][adjJ].classList.contains(CELL_HIGHLIGHTED_CLASS) ||
        !highlight && cellDivs[adjI][adjJ].classList.contains(CELL_HIGHLIGHTED_CLASS)
      )
    )
      highlightRegion(adjI, adjJ, highlight, t);
  }
};

let isSolving = false;
let solutionIsShown = false;
function setIsSolving(val) {
  isSolving = val;
  setToolsDisabledValue(val);
  document.getElementById("loader").style.display = val ? "block" : "none";
  if (val) resetAddTerritoryStates();
}

function clearSolution() {
  solutionIsShown = false;
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      cellDivs[i][j].classList.remove(DASH_CLASS, BAR_CLASS);
}

// States for "Solve yourself" feature
let userIsSolvingManually = false;
let isValidating = false;
let hintIsShown = false;
function clearHints() {
  hintIsShown = false;
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      cellDivs[i][j].classList.remove(EMPTY_CELL, BAD_CELL, BAD_TERRITORY);
}

/* ============== Startup Tool Widgets =============== */

function setupLoadExampleInstances() {
  const select = document.getElementById("example-instances");
  EXAMPLE_INSTANCES.forEach((instance, idx) => {
    const option = document.createElement("option");
    option.value = idx;
    option.text = instance.name.split(".")[0];
    select.appendChild(option);
  });

  select.addEventListener("change", (e) => {
    const instance = EXAMPLE_INSTANCES[parseInt(e.target.value)]
    m = instance.m;
    n = instance.n;
    document.getElementById("m").value = m;
    document.getElementById("n").value = n;
    adjustGridViewBasedOnColumnCount();
    generateInitialGrid();
    territoryNums = instance.R;
    recalculateTerritories();
    for (let t = 0; t < r; t++) {
      const [iTop, jTop] = topCornerTerritories[t];
      cellDivs[iTop][jTop].getElementsByTagName("p")[0].textContent = instance.N[t] != -1 ? instance.N[t] : "";
    }
    drawTerritories();

    select.blur();
  });
}

function setupDrawYourselfButton() {
  const startDrawingButton = document.getElementById("draw");
  const finishDrawingButton = document.getElementById("finish-draw");
  const setStartupDisplay = (isStartup) => {
    if (solutionIsShown) clearSolution();
    selectedTool = "";
    document.getElementById("add-territory").checked = false;
    document.getElementById("add-constraint").checked = false;
    messageDiv.textContent = "";
    setEditables(false);
    document.getElementById("startup").style.display = isStartup ? "flex" : "none";
    document.getElementById("draw-yourself").style.display = isStartup ? "none" : "flex";
  };
  startDrawingButton.addEventListener("click", () => setStartupDisplay(false));

  const validateInstanceRectangular = () => {
    for (let i = 0; i < m - 1; i++) {
      for (let j = 0; j < n - 1; j++) {
        let con1 = (territoryNums[i][j] == territoryNums[i+1][j+1] && territoryNums[i+1][j] != territoryNums[i][j+1]);
        let con2 = (territoryNums[i][j] != territoryNums[i+1][j+1] && territoryNums[i+1][j] == territoryNums[i][j+1]);
        if (con1 || con2)
          return false;
      }
    }
    return true;
  };
  finishDrawingButton.addEventListener("click", () => {
    if (!validateInstanceRectangular()) {
      alert("All territories must be rectangular.");
      return;
    }
    setStartupDisplay(true)
  });
}

function setupSolveYourself() {
  const solveYourselfButton = document.getElementById("solve-yourself");
  const validateButton = document.getElementById("validate");
  const setOthersDisabled = (val) => {
    document.getElementById("example-instances").disabled = val;
    document.getElementById("draw").disabled = val;
    document.getElementById("submit").disabled = val;
  };
  solveYourselfButton.addEventListener("click", () => {
    cellsFilled = 0;
    clearSolution();
    if (!userIsSolvingManually) {
      setOthersDisabled(true);
      solveYourselfButton.textContent = "Give Up";
      validateButton.style.display = "block";
      messageDiv.textContent = "Click the cell to fill it with a symbol.";
    } else {
      setOthersDisabled(false);
      if (hintIsShown) clearHints();
      solveYourselfButton.textContent = "Solve Yourself";
      validateButton.style.display = "none";
      messageDiv.textContent = "";
    }
    userIsSolvingManually = !userIsSolvingManually;
  });

  validateButton.addEventListener("click", () => {
    // Validate solution
    isValidating = true;
    setToolsDisabledValue(true);
    document.getElementById("loader-validate").style.display = "block";

    // Construct N based on the drawn puzzle
    let N = new Array(r);
    for (let t = 0; t < r; t++) {
      const [topI, topJ] = topCornerTerritories[t];
      const val = cellDivs[topI][topJ].getElementsByTagName("p")[0].textContent;
      N[t] = isNumeric(val) ? parseInt(val) : -1;
    }

    // Construct S based on the solution the user has drawn
    let S = Array(m).fill().map(() => Array(n).fill());
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        S[i][j] = cellDivs[i][j].classList.contains(DASH_CLASS)
          ? "-" : cellDivs[i][j].classList.contains(BAR_CLASS)
          ? "|" : "";

    const url = "/validate";
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        m, n, r, N, S,
        R: territoryNums,
      }),
    }).then((res) => {
      if (!res.ok) throw new Error('Request failed with status: ' + res.status);
      return res.json();
    }).then((data) => {
      const { correct, bad_cells, bad_territories, empty_cells } = data;
      if (correct) {
        messageDiv.textContent = "Congrats! You've solved the puzzle! 🥳 Press \"Done\" to return.";
        solveYourselfButton.textContent = "Done";
      } else {
        hintIsShown = true;
        messageDiv.textContent = "Your solution is incorrect 😢 We added red hints to assist you.";
        bad_cells.forEach((c) => {
          const [i, j] = c;
          cellDivs[i][j].classList.add(BAD_CELL);
        });
        bad_territories.forEach((t) => {
          const [topI, topJ] = topCornerTerritories[t];
          cellDivs[topI][topJ].classList.remove(BAD_CELL);
          cellDivs[topI][topJ].classList.add(BAD_TERRITORY);
        });
        empty_cells.forEach((c) => {
          const [i, j] = c;
          cellDivs[i][j].classList.remove(BAD_CELL, BAD_TERRITORY);
          cellDivs[i][j].classList.add(EMPTY_CELL);
        });
      }
    }).catch((e) => {
      alert(e.message);
    }).finally(() => {
      isValidating = false;
      setToolsDisabledValue(false);
      document.getElementById("loader-validate").style.display = "none";
      document.getElementById("example-instances").disabled = true;
      document.getElementById("draw").disabled = true;
      document.getElementById("submit").disabled = true;
    });
  });
}

function setupStartupTools() {
  setupLoadExampleInstances();
  setupDrawYourselfButton();
  setupSolveYourself();
}

/* =================================================== */

/* ============== Drawing Tool widgets =============== */

function setToolsDisabledValue(value) {
  document.querySelectorAll("#m,#n,#add-territory,#add-constraint,#reset,#submit,#example-instances,#draw,#solve-yourself,#validate")
    .forEach(e => {
      e.disabled = value;
    })
}

function adjustGridViewBasedOnColumnCount() {
  const gridDiv = document.getElementById("grid");
  for (const minCellCount of Object.keys(GRID_WIDTH).reverse()) {
    if (n >= parseInt(minCellCount)) {
      gridDiv.style.width = `max(300px, ${GRID_WIDTH[minCellCount]})`;
      break;
    }
  }
  for (const minCellCount of Object.keys(FONT_SIZE).reverse()) {
    if (n >= parseInt(minCellCount)) {
      gridDiv.style.fontSize = FONT_SIZE[minCellCount];
      break;
    }
  }
  gridDiv.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
}

function setupPuzzleSizeSettingsWidget() {
  // Puzzle size settings
  const mInput = document.getElementById("m");
  const nInput = document.getElementById("n");
  mInput.addEventListener("change", (e) => {
    if (e.target.value) {
      e.target.value = clamp(e.target.value, MINMAX_SIZE[0], MINMAX_SIZE[1]);
      m = parseInt(e.target.value);
      generateInitialGrid();
      recalculateTerritories();
    }
  });
  nInput.addEventListener("change", (e) => {
    if (e.target.value) {
      e.target.value = clamp(e.target.value, MINMAX_SIZE[0], MINMAX_SIZE[1]);
      n = parseInt(e.target.value);
      adjustGridViewBasedOnColumnCount();
      generateInitialGrid();
      recalculateTerritories();
    }
  });
}

function setupTools() {
  const handleToolChange = (toolName) => {
    if (toolName === TOOLS.ADD_TERRITORY) {
      selectedTool = TOOLS.ADD_TERRITORY;
      messageDiv.textContent = "Pick two opposite corners of the territory.";
      setEditables(false);
    } else {
      selectedTool = TOOLS.ADD_CONSTRAINT;
      messageDiv.textContent = "Select a territory to add a constraint.";
      resetAddTerritoryStates();
      setEditables(true);
    }
  }
  document.getElementById("add-territory").addEventListener("change", (e) => handleToolChange(e.target.value));
  document.getElementById("add-constraint").addEventListener("change", (e) => handleToolChange(e.target.value));
}

function setupResetButton() {
  document.getElementById("reset").addEventListener("click", (e) => generateInitialGrid())
}

function setupSubmitButton() {
  const submitButton = document.getElementById("submit");
  submitButton.addEventListener("click", (e) => {
    selectedTool = "";
    document.getElementById("add-territory").checked = false;
    document.getElementById("add-constraint").checked = false;
    messageDiv.textContent = "";
    setIsSolving(true);
    let N = new Array(r);
    for (let t = 0; t < r; t++) {
      const [topI, topJ] = topCornerTerritories[t];
      const val = cellDivs[topI][topJ].getElementsByTagName("p")[0].textContent;
      N[t] = isNumeric(val) ? parseInt(val) : -1;
    }

    const url = "/solve";
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        m, n, r, N,
        R: territoryNums,
      }),
    }).then((res) => {
      if (!res.ok) throw new Error('Request failed with status: ' + res.status);
      return res.json();
    }).then((data) => {
      setIsSolving(false);
      const { is_solvable, solution } = data;
      if (is_solvable) {
        for (let i = 0; i < m; i++)
          for (let j = 0; j < n; j++)
            cellDivs[i][j].classList.add(solution[i][j] === "-" ? DASH_CLASS : BAR_CLASS);
        solutionIsShown = true;
        messageDiv.textContent = "The puzzle has a solution."
      } else {
        messageDiv.textContent = "The puzzle does not have a solution."
      }
    }).catch((e) => {
      setIsSolving(false);
      alert(e.message);
    });
  });
}

function setupDrawingToolWidgets() {
  setupPuzzleSizeSettingsWidget();
  setupTools();
  setupResetButton();
  setupSubmitButton();
}

/* =========================================== */

function handleClickSolve(i, j) {
  if (hintIsShown) clearHints();
  messageDiv.textContent = "Click the cell to fill it with a symbol.";
  document.getElementById("solve-yourself").textContent = "Give Up";
  if (cellDivs[i][j].classList.contains(DASH_CLASS)) {
    cellDivs[i][j].classList.remove(DASH_CLASS);
    cellDivs[i][j].classList.add(BAR_CLASS);
  } else if (cellDivs[i][j].classList.contains(BAR_CLASS)) {
    cellDivs[i][j].classList.remove(BAR_CLASS);
  } else {
    cellDivs[i][j].classList.add(DASH_CLASS);
  }
}

function handleClickDraw(i, j) {
  const handleAddTerritory = () => {
    if (cornersSelected === null) {
      cellDivs[i][j].style.backgroundColor = "var(--blue-300)";
      cornersSelected = [i, j];
    } else {
      const [i2, j2] = cornersSelected;
      for (let x = Math.min(i,i2); x <= Math.max(i,i2); x++) {
        for (let y = Math.min(j,j2); y <= Math.max(j,j2); y++) {
          const [topX, topY] = topCornerTerritories[territoryNums[x][y]];
          cellDivs[topX][topY].getElementsByTagName("p")[0].textContent = "";
          territoryNums[x][y] = r;
        }
      }
      recalculateTerritories();
      drawTerritories();
      resetAddTerritoryStates();
    }
  };

  const handleAddConstraint = () => {
    const t = territoryNums[i][j];
    const [iTop, jTop] = topCornerTerritories[t];
    if (i !== iTop || j !== jTop)
      cellDivs[iTop][jTop].getElementsByTagName("p")[0].focus();
  };

  if (selectedTool === TOOLS.ADD_TERRITORY) {
    handleAddTerritory();
  } else if (selectedTool === TOOLS.ADD_CONSTRAINT) {
    handleAddConstraint();
  }
}

function handleHover(i, j) {
  if (selectedTool !== TOOLS.ADD_CONSTRAINT) return;
  if (territoryNums[i][j] === currentlyHoveredTerritory) return;

  if (currentlyHoveredTerritory !== -1) {
    const [x, y] = topCornerTerritories[currentlyHoveredTerritory];
    highlightRegion(x, y, false, currentlyHoveredTerritory);
  }
  currentlyHoveredTerritory = territoryNums[i][j];
  highlightRegion(i, j, true, currentlyHoveredTerritory);
}

function generateInitialGrid() {
  cellDivs = [];
  territoryNums = Array.from(Array(m), _ => Array(n).fill(0));

  const gridDiv = document.getElementById("grid");
  gridDiv.replaceChildren();
  gridDiv.addEventListener("mouseleave", (e) => {
    if (selectedTool !== TOOLS.ADD_CONSTRAINT) return;
    if (currentlyHoveredTerritory === -1) return;

    const [x, y] = topCornerTerritories[currentlyHoveredTerritory];
    highlightRegion(x, y, false, currentlyHoveredTerritory);
    currentlyHoveredTerritory = -1;
  });

  const generateCell = (i, j) => {
    const cellDiv = document.createElement("div");
    cellDiv.classList.add("cell");
    cellDiv.id = `cell-${i}-${j}`;
    const p = document.createElement("p");

    p.addEventListener("keydown", (e) => {
      const key = e.key;
      
      if (!isNumeric(key) && !isTypableKey(key))
        e.preventDefault();
      
      if (isNumeric(key)) {
        value = parseInt(e.target.textContent + key);
        if (value < 1 || value > territorySizes[territoryNums[i][j]]) {
          alert("Constraint is larger than territory size.")
          e.preventDefault();
        }
      }
    });

    cellDiv.appendChild(p);
    cellDiv.addEventListener("click", () => {
      if (isSolving) return;
      if (isValidating) return;
      if (userIsSolvingManually)
        handleClickSolve(i, j);
      else
        handleClickDraw(i, j);
    });
    cellDiv.addEventListener("mouseover", () => handleHover(i, j));
    return cellDiv;
  };

  for (let i = 0; i < m; i++) {
    let currentRow = [];
    for (let j = 0; j < n; j++) {
      const cellDiv = generateCell(i, j);
      gridDiv.appendChild(cellDiv);
      currentRow.push(cellDiv);
    }
    cellDivs.push(currentRow);
  }

  selectedTool = "";
  document.getElementById("add-territory").checked = false;
  document.getElementById("add-constraint").checked = false;
  messageDiv.textContent = "";
  recalculateTerritories();
  drawTerritories();
}

function recalculateTerritories() {
  let vis = {};
  territorySizes = {}, topCornerTerritories = {};
  function dfs(i, j, num) {
    vis[[i,j]] = true;
    for (const dir in DIRS) {
      const [dx, dy] = DIRS[dir];
      let adjI = i + dx, adjJ = j + dy;
      if (validCell(adjI, adjJ) && !vis[[adjI,adjJ]] && territoryNums[i][j] == territoryNums[adjI][adjJ])
        dfs(adjI, adjJ, num);
    }
    territoryNums[i][j] = num;
    territorySizes[num] = (num in territorySizes) ? ++territorySizes[num] : 1;
    if (num in topCornerTerritories) {
      const [curI, curJ] = topCornerTerritories[num];
      if (i < curI || (i == curI && j < curJ))
        topCornerTerritories[num] = [i, j];
    } else {
      topCornerTerritories[num] = [i, j];
    }
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
  setupStartupTools();
  setupDrawingToolWidgets();
  generateInitialGrid();
  drawTerritories();
}

main();

/* ======= utils ========= */

function clamp(num, min, max) { return Math.min(Math.max(num, min), max); }
function validCell(x, y) { return x >= 0 && x < m && y >= 0 && y < n; }
function isNumeric(s) { return /^\d+$/.test(s); }
function isTypableKey(key) { return ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Home", "End"].includes(key); }
