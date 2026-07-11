import ValleyArticle from './Valley/ValleyArticle'
import ReverieArticle from './Reverie/ReverieArticle'
import RepriseArticle from './Reprise/RepriseArticle'
import DetourArticle from './Detour/DetourArticle'
import TraceArticle from './Trace/TraceArticle'

const articlesByTicketId = {
  U: { slug: 'valley', title: 'Beginning Before Knowing', Content: ValleyArticle },
  P1: { slug: 'reverie', title: 'Giving Shape to an Unfinished Thought', Content: ReverieArticle },
  P2: { slug: 'reprise', title: 'Repetition Is a Form of Progress', Content: RepriseArticle },
  E: { slug: 'detour', title: 'The Smaller Screen Changed the Project', Content: DetourArticle },
  R: { slug: 'trace', title: 'What Remains After the Motion Ends', Content: TraceArticle },
}

export default articlesByTicketId
