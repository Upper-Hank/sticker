const cells = []

for (let r = 1; r <= 4; r++) {
  for (let c = 1; c <= 12; c++) {
    cells.push({ row: r, col: c, key: `R${r}C${c}` })
  }
}

const placements = {
  U: { graphic: 'U', bgColor: '#FF5254', cells: ['R1C1', 'R2C2', 'R2C5', 'R2C9', 'R4C4'] },
  P1: { graphic: 'P1', bgColor: '#FFD75E', cells: ['R1C7', 'R2C11', 'R3C3', 'R4C9'] },
  P2: { graphic: 'P2', bgColor: '#63E8BA', cells: ['R1C6', 'R1C10', 'R2C4', 'R3C1', 'R3C8', 'R3C12', 'R4C7'] },
  E: { graphic: 'E', bgColor: '#6ECAFF', cells: ['R1C4', 'R2C8', 'R3C5', 'R4C2', 'R4C12'] },
  R: { graphic: 'R', bgColor: '#A58AE8', cells: ['R1C2', 'R2C10', 'R3C6'] },
}

const textBlocks = [
  {
    key: 'welcome',
    row: 2,
    col: 1,
    align: 'left-bottom',
    lines: ['welcome', 'Nice to meet you'],
  },
  {
    key: 'experience',
    row: 2,
    col: 6,
    colSpan: 2,
    align: 'left-top',
    lines: [
      'This is an experience like no other.',
      'I’m glad you’re here to see it.',
      'Try clicking these cards.',
    ],
  },
  {
    key: 'next-journey',
    row: 3,
    col: 9,
    colSpan: 2,
    align: 'left-top',
    lines: [
      'Perhaps it’s time for the next part of our journey.',
      'Try clicking the button.',
    ],
  },
]

const selectedCard = 'R2C9'

function getCellConfig(key) {
  for (const [type, config] of Object.entries(placements)) {
    if (config.cells.includes(key)) {
      return { type, ...config }
    }
  }
  return { type: 'empty' }
}

export { cells, placements, textBlocks, selectedCard, getCellConfig }
