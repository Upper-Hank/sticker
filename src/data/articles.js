const articles = [
  {
    slug: 'valley',
    stage: 'Unknown',
    title: 'Beginning Before Knowing',
    summary: 'A project can begin before its direction becomes visible. Uncertainty is not an obstacle; it is part of the material.',
    sections: [
      { heading: 'Before there was a project', body: 'Upper began with five letters, a handful of colors, and an interest in paths that could draw themselves. There was no product brief and no final screen waiting to be built. The first task was simply to notice which forms felt alive.' },
      { heading: 'The first constraint', body: 'Limiting the system to five graphics made every decision more visible. Repetition created rhythm, while small differences in color, curve, and timing gave each letter a distinct character.' },
      { heading: 'Letting form lead', body: 'The paths suggested drawing. The colored cards suggested stickers. The repeated letters suggested collecting and arranging. Interaction did not arrive after the visual design; it grew out of it.' },
    ],
    question: 'What are you willing to begin before you understand it?',
  },
  {
    slug: 'reverie',
    stage: 'Possibility',
    title: 'Giving Shape to an Unfinished Thought',
    summary: 'The identity is not a single mark. It is the relationship between letters, colors, type, space, and motion.',
    sections: [
      { heading: 'Letters as characters', body: 'Each letter carries a different gesture: a valley, a loop, a return, a detour, and a trace. Together they behave less like a wordmark and more like a small cast of characters.' },
      { heading: 'A compact visual system', body: 'Bright cards sit against warm neutral surfaces. IBM Plex Serif slows the titles down, while Plex Sans keeps the supporting language direct. Rounded containers soften the mechanical precision of SVG paths.' },
      { heading: 'Motion as identity', body: 'A path drawing itself feels different from an object fading in. A sticker stretching under a finger feels different from a button changing color. Those choices give the system its voice.' },
    ],
    question: 'When does a collection of shapes begin to feel like a language?',
  },
  {
    slug: 'reprise',
    stage: 'Process',
    title: 'Repetition Is a Form of Progress',
    summary: 'A good interaction is defined not only by ideal playback, but by what happens when the user interrupts it.',
    sections: [
      { heading: 'The animation that went offline', body: 'The first card interaction worked when it was played once and left alone. Rapid clicks, long presses, and page transitions exposed competing timelines and incomplete cleanup. The safest decision was to remove it before rebuilding it.' },
      { heading: 'Separating ownership', body: 'Page transitions now control the outer card, while pointer feedback controls an inner interaction layer. SVG paths own their drawing state. This small DOM change removed an entire class of transform conflicts.' },
      { heading: 'Remembering continuous input', body: 'Rapid clicks are treated as one continuous press. Input received during a locked animation is remembered, and resumes automatically if the pointer is still held. The interaction follows intent instead of replaying events mechanically.' },
    ],
    question: 'What should an interface remember when the user interrupts it?',
  },
  {
    slug: 'detour',
    stage: 'Experiment',
    title: 'The Smaller Screen Changed the Project',
    summary: 'Responsive design did not preserve the desktop layout. It preserved the idea by finding a different form for touch.',
    sections: [
      { heading: 'A desktop-only assumption', body: 'The first mobile version asked visitors to open the project on desktop. It was technically honest, but it made the smaller screen feel like a dead end.' },
      { heading: 'From journey to playground', body: 'Desktop kept the horizontal narrative. Mobile became immediate and tactile: drag a sticker, place it in the slot, and open its ticket. The same visual system learned a different behavior.' },
      { heading: 'Removing to clarify', body: 'Five destination slots became one. Navigation buttons disappeared from the ticket. A decorative handle became a real closing gesture. Each removal made the central loop easier to understand.' },
    ],
    question: 'What should remain when the layout can no longer stay the same?',
  },
  {
    slug: 'trace',
    stage: 'Reflection',
    title: 'What Remains After the Motion Ends',
    summary: 'The final shape of the project is defined as much by removed ideas as by added features.',
    sections: [
      { heading: 'A record of decisions', body: 'Some interactions were disabled, rebuilt, simplified, and tested again. The project carries those decisions even when the discarded versions are no longer visible.' },
      { heading: 'Design and engineering', body: 'A visual handle needs a real gesture. A graceful transition needs reliable state cleanup. In an interaction project, implementation is not separate from design; it is where design becomes specific.' },
      { heading: 'A place to continue', body: 'Upper has become a visual introduction, a small playground, and a record of iteration. These stories add another layer without asking every visitor to read before they can play.' },
    ],
    question: 'What does a project leave behind when it is no longer being edited?',
  },
]

export default articles
