export type FrameworkDimension = {
  id: string;
  label: string;
  colorClass: string;
};

export type FrameworkCompetency = {
  id: string;
  title: string;
  dimensionId: string;
  levels: {
    understand: string;
    apply: string;
    create: string;
  };
  narrative: string;
};

export const frameworkDimensions: FrameworkDimension[] = [
  { id: "human-centred-mindset", label: "Human-Centred Mindset", colorClass: "bg-blue-100 text-blue-700" },
  { id: "ethics-of-ai", label: "Ethics of AI", colorClass: "bg-purple-100 text-purple-700" },
  {
    id: "ai-techniques-and-applications",
    label: "AI Techniques & Applications",
    colorClass: "bg-emerald-100 text-emerald-700",
  },
  { id: "ai-system-design", label: "AI System Design", colorClass: "bg-orange-100 text-orange-700" },
];

export const frameworkCompetencies: FrameworkCompetency[] = [
  {
    id: "1.1",
    title: "Human Agency",
    dimensionId: "human-centred-mindset",
    levels: {
      understand: "Explain how people retain meaningful control over AI-supported decisions.",
      apply: "Use AI tools while documenting human judgement and intervention points.",
      create: "Design workflows that protect learner autonomy when AI is introduced.",
    },
    narrative:
      "Human agency focuses on keeping people in charge of purpose, oversight, and accountability when using AI in educational and professional settings.",
  },
  {
    id: "1.2",
    title: "Human Accountability",
    dimensionId: "human-centred-mindset",
    levels: {
      understand: "Describe who is responsible for AI-supported outcomes.",
      apply: "Attribute decisions to named human roles when AI informs recommendations.",
      create: "Build governance structures that assign clear accountability for AI use.",
    },
    narrative:
      "Students should recognise that responsibility for outcomes remains with people and institutions, not AI systems themselves.",
  },
  {
    id: "1.3",
    title: "Human Rights and Inclusion",
    dimensionId: "human-centred-mindset",
    levels: {
      understand: "Identify rights and inclusion risks when AI is deployed.",
      apply: "Evaluate AI use cases for fairness and accessibility impacts.",
      create: "Design inclusive AI-supported learning practices that protect rights.",
    },
    narrative:
      "This competency foregrounds inclusion, accessibility, and rights-based thinking in AI-supported education.",
  },
  {
    id: "2.1",
    title: "Ethical Reflection",
    dimensionId: "ethics-of-ai",
    levels: {
      understand: "Explain core ethical principles relevant to AI.",
      apply: "Use ethical lenses to evaluate trade-offs in AI-enabled tasks.",
      create: "Produce assessment designs that make ethical reasoning explicit.",
    },
    narrative:
      "Ethical reflection supports informed judgement in uncertain contexts where AI creates new choices and consequences.",
  },
  {
    id: "2.2",
    title: "Bias and Fairness",
    dimensionId: "ethics-of-ai",
    levels: {
      understand: "Recognise how bias can enter datasets and models.",
      apply: "Test AI outputs for unfair patterns and document findings.",
      create: "Develop mitigation strategies for unfair or harmful model behaviour.",
    },
    narrative:
      "Learners should be able to identify inequity risks and respond with concrete fairness safeguards.",
  },
  {
    id: "2.3",
    title: "Privacy and Data Stewardship",
    dimensionId: "ethics-of-ai",
    levels: {
      understand: "Describe data privacy principles and consent requirements.",
      apply: "Select AI workflows that minimise unnecessary personal data exposure.",
      create: "Design compliant data handling processes for AI-enabled work.",
    },
    narrative:
      "Privacy literacy is foundational for safe AI use in education and employment contexts.",
  },
  {
    id: "3.1",
    title: "AI Concepts and Methods",
    dimensionId: "ai-techniques-and-applications",
    levels: {
      understand: "Describe key AI concepts including training, inference, and evaluation.",
      apply: "Use AI techniques appropriately for bounded practical tasks.",
      create: "Compose multi-step workflows combining suitable AI methods.",
    },
    narrative:
      "Students should know what AI methods can and cannot do, and when each approach is suitable.",
  },
  {
    id: "3.2",
    title: "Data and Representation",
    dimensionId: "ai-techniques-and-applications",
    levels: {
      understand: "Explain how data quality shapes model performance.",
      apply: "Prepare and critique data representations used by AI tools.",
      create: "Develop data strategies that improve model reliability and transparency.",
    },
    narrative:
      "Reliable AI outcomes depend on sound data handling and critical review of representation choices.",
  },
  {
    id: "3.3",
    title: "Prompting and Interaction",
    dimensionId: "ai-techniques-and-applications",
    levels: {
      understand: "Explain how interaction patterns influence AI output quality.",
      apply: "Craft prompts that improve relevance, structure, and verification.",
      create: "Design reusable interaction protocols for discipline-specific AI tasks.",
    },
    narrative:
      "Effective interaction skills help students obtain dependable outputs and reduce misuse risks.",
  },
  {
    id: "4.1",
    title: "Problem Framing",
    dimensionId: "ai-system-design",
    levels: {
      understand: "Define problems that can be responsibly supported by AI.",
      apply: "Set success criteria and constraints before introducing AI tools.",
      create: "Formulate robust AI project briefs with measurable outcomes.",
    },
    narrative:
      "Good system design starts with clear framing, constraints, and value-oriented objectives.",
  },
  {
    id: "4.2",
    title: "System Evaluation",
    dimensionId: "ai-system-design",
    levels: {
      understand: "Describe evaluation metrics and validation approaches for AI outputs.",
      apply: "Run structured checks for quality, reliability, and safety.",
      create: "Build evaluation plans that include human review and improvement loops.",
    },
    narrative:
      "Evaluation competency ensures that AI-enabled systems are tested against educational goals and risks.",
  },
  {
    id: "4.3",
    title: "Responsible Deployment",
    dimensionId: "ai-system-design",
    levels: {
      understand: "Identify deployment risks, stakeholders, and governance requirements.",
      apply: "Implement rollout controls, monitoring, and escalation pathways.",
      create: "Design sustainable deployment models that include policy and staff capability.",
    },
    narrative:
      "Responsible deployment links technical setup with governance, monitoring, and continuous review.",
  },
];

export function findDimension(dimensionId: string) {
  return frameworkDimensions.find((dimension) => dimension.id === dimensionId);
}
