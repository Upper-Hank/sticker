const cells = []

for (let r = 1; r <= 4; r++) {
  for (let c = 1; c <= 8; c++) {
    cells.push({ row: r, col: c, key: `R${r}C${c}` })
  }
}

const placements = {
  U: { graphic: 'U', bgColor: '#FF5254', cells: ['R2C2', 'R2C5', 'R3C8', 'R4C4'] },
  P1: { graphic: 'P1', bgColor: '#FFD75E', cells: ['R1C7', 'R3C3'] },
  P2: { graphic: 'P2', bgColor: '#63E8BA', cells: ['R1C6', 'R2C4', 'R3C1', 'R4C7'] },
  E: { graphic: 'E', bgColor: '#6ECAFF', cells: ['R1C1', 'R2C8', 'R3C5', 'R4C2'] },
  R: { graphic: 'R', bgColor: '#A58AE8', cells: ['R1C2', 'R3C6'] },
  placeholder: { cells: ['R1C5', 'R2C3', 'R4C6'] },
}

const selectedCard = 'R2C5'

function getCellConfig(key) {
  for (const [type, config] of Object.entries(placements)) {
    if (config.cells.includes(key)) {
      return { type, ...config }
    }
  }
  return { type: 'empty' }
}

export { cells, placements, selectedCard, getCellConfig }
