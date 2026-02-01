import { Scenario } from './types'

export const defaultScenarios: Scenario[] = [
  {
    id: 'crisis-layoffs',
    name: 'Workforce Reduction Announcement',
    description:
      'Practice handling questions about layoffs and company restructuring',
    category: 'crisis',
    difficulty: 'advanced',
    recommendedForCounterparties: ['journalist', 'stakeholder', 'public'],
    recommendedForSituations: ['crisis'],
    priority: 2,
    context: `The company has just announced a 15% workforce reduction (approximately 500 employees).
The spokesperson is the VP of Communications. This is the first media interview after the announcement.
The journalist is from a major business publication and is known for tough questioning.`,
    questions: [
      {
        id: 'q1',
        text: 'Can you explain why the company decided to lay off 500 employees?',
        followUps: [
          'But your last earnings report showed record profits. How do you justify this?',
          'Were executives asked to take pay cuts before this decision?',
        ],
        difficulty: 'medium',
        expectedDurationSeconds: 30,
        tags: ['layoffs', 'rationale'],
      },
      {
        id: 'q2',
        text: "How do you respond to criticism that the company prioritized shareholders over employees?",
        followUps: ['So you are putting profits over people?'],
        difficulty: 'hostile',
        expectedDurationSeconds: 25,
        tags: ['layoffs', 'values'],
      },
      {
        id: 'q3',
        text: 'Will there be more layoffs in the future?',
        followUps: [
          "So you can't guarantee that these will be the last layoffs?",
        ],
        difficulty: 'hostile',
        expectedDurationSeconds: 20,
        tags: ['layoffs', 'future'],
      },
    ],
    keyMessages: [
      'This was a difficult but necessary decision for long-term sustainability',
      'We are providing comprehensive support including severance and career services',
      'We remain committed to the employees who are staying',
    ],
    redLines: [
      'Do not speculate about future layoffs',
      'Do not discuss specific severance amounts',
      'Do not blame specific business units or individuals',
    ],
  },
  {
    id: 'product-launch',
    name: 'New Product Launch',
    description: 'Practice announcing a new product to the media',
    category: 'product',
    difficulty: 'beginner',
    recommendedForCounterparties: ['journalist', 'partner', 'customer'],
    recommendedForSituations: ['demo', 'interview'],
    priority: 1,
    context: `The company is launching a new AI-powered feature for its main product.
This is an exclusive interview with a tech journalist from a respected publication.
The journalist is generally favorable but will ask probing questions.`,
    questions: [
      {
        id: 'q1',
        text: 'What makes this new feature different from what competitors are offering?',
        followUps: [
          'But Company X announced something similar last month. Are you playing catch-up?',
        ],
        difficulty: 'medium',
        expectedDurationSeconds: 30,
        tags: ['product', 'differentiation'],
      },
      {
        id: 'q2',
        text: 'Tell me about the AI technology behind this. Is it built in-house or are you using third-party models?',
        followUps: ['What about data privacy concerns with AI?'],
        difficulty: 'medium',
        expectedDurationSeconds: 30,
        tags: ['product', 'technology'],
      },
      {
        id: 'q3',
        text: 'When will this be available and how much will it cost?',
        followUps: [],
        difficulty: 'soft',
        expectedDurationSeconds: 20,
        tags: ['product', 'pricing'],
      },
    ],
    keyMessages: [
      'This feature addresses a real customer pain point we have heard repeatedly',
      'We have been developing this for over a year with extensive user research',
      'Early beta users have seen significant improvements in their workflow',
    ],
    redLines: [
      'Do not trash competitors by name',
      'Do not promise specific timelines for future features',
      'Do not reveal unannounced pricing or features',
    ],
  },
  {
    id: 'general-profile',
    name: 'Company Profile Interview',
    description:
      'Practice a general interview about the company and your role',
    category: 'general',
    difficulty: 'beginner',
    recommendedForCounterparties: ['journalist', 'stakeholder', 'public'],
    recommendedForSituations: ['interview'],
    priority: 1,
    context: `A business journalist is doing a profile piece on the company for a general business audience.
This is a friendly but thorough interview.
The journalist wants to understand the company story and vision.`,
    questions: [
      {
        id: 'q1',
        text: 'Tell me about the company and what problem you are solving.',
        followUps: [],
        difficulty: 'soft',
        expectedDurationSeconds: 30,
        tags: ['overview'],
      },
      {
        id: 'q2',
        text: "What's the company culture like?",
        followUps: [
          "I've heard reports of burnout among employees. Can you address that?",
        ],
        difficulty: 'medium',
        expectedDurationSeconds: 25,
        tags: ['culture'],
      },
      {
        id: 'q3',
        text: "Where do you see the company in five years?",
        followUps: ['How will you compete against bigger players in the market?'],
        difficulty: 'medium',
        expectedDurationSeconds: 25,
        tags: ['vision', 'future'],
      },
    ],
    keyMessages: [
      "We're solving [specific problem] for [target customer]",
      'Our team is passionate about our mission',
      'We prioritize work-life balance and employee wellbeing',
    ],
    redLines: [],
  },
  {
    id: 'crisis-security',
    name: 'Security Incident Response',
    description: 'Practice communicating about a data security incident',
    category: 'crisis',
    difficulty: 'advanced',
    recommendedForCounterparties: [
      'journalist',
      'customer',
      'public',
      'stakeholder',
    ],
    recommendedForSituations: ['crisis'],
    priority: 2,
    context: `The company recently discovered and disclosed a security incident that potentially affected customer data.
The spokesperson is the Chief Information Security Officer.
The journalist is a cybersecurity reporter with deep technical knowledge.`,
    questions: [
      {
        id: 'q1',
        text: 'Can you walk me through what exactly happened and when?',
        followUps: ['Why did it take so long to discover the breach?'],
        difficulty: 'medium',
        expectedDurationSeconds: 30,
        tags: ['security', 'timeline'],
      },
      {
        id: 'q2',
        text: 'How many customers were affected and what type of data was compromised?',
        followUps: [
          'Were passwords or financial information included?',
          'Have you seen any evidence of the data being used maliciously?',
        ],
        difficulty: 'hostile',
        expectedDurationSeconds: 25,
        tags: ['security', 'impact'],
      },
      {
        id: 'q3',
        text: "What are you doing to make sure this doesn't happen again?",
        followUps: [],
        difficulty: 'medium',
        expectedDurationSeconds: 25,
        tags: ['security', 'remediation'],
      },
    ],
    keyMessages: [
      'Customer security and privacy are our top priorities',
      "We discovered this through our own monitoring and immediately took action",
      "We are being fully transparent about what happened and what we're doing",
    ],
    redLines: [
      'Do not speculate about the attackers or their motives',
      'Do not discuss specific security tools or configurations',
      'Do not reveal information that could help future attackers',
    ],
  },
]

export function getScenarioById(id: string): Scenario | undefined {
  return defaultScenarios.find((s) => s.id === id)
}

export function getScenariosByCategory(
  category: Scenario['category']
): Scenario[] {
  return defaultScenarios.filter((s) => s.category === category)
}
