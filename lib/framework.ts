export type FrameworkDimension = {
  id: string;
  label: string;
  colorClass: string;
};

export type FrameworkCompetency = {
  id: string;
  title: string;
  dimensionId: string;
  level?: "understand" | "apply" | "create";
  levels: {
    understand?: string;
    apply?: string;
    create?: string;
  };
  narrative?: string;
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
    level: "understand",
    levels: {
      understand: "Students are expected to be able to recognize that AI is human-led and that the decisions of the AI creators influence how AI systems impact human rights, human–AI  interaction, and their own lives and societies. They are expected to understand the implications of protecting human agency throughout the design, provision and use of AI. Students will understand what it means for AI to be human-controlled, and what the consequences could be when that is not the case. ",
    },
  },
  {
    id: "1.2",
    title: "Human Accountability",
    dimensionId: "human-centred-mindset",
    level: "apply",
    levels: {
      apply: "Students are expected to recognize that human accountabilities are the legal obligations of AI creators and AI service providers, and to understand what human accountabilities they should assume during the design and use of AI. They should also develop an awareness that human accountability is a legal and social responsibility when using AI to assist in decision-making, and that human choice should not be ceded to AI when making high-stakes decisions. ",
    },
  },
  {
    id: "1.3",
    title: "Citizenship in the era of AI",
    dimensionId: "human-centred-mindset",
    level: "create",
    levels: {
      create: "Students are expected to critically understand the impact of AI on human societies and to promote responsible and inclusive design and use of AI for sustainable development. They should have an awareness of their civic and social responsibility as citizens in the era of AI. Students are also expected to develop a desire to continue learning about, and using, AI throughout their lives to support self-actualization.",
    },
  },
  {
    id: "2.1",
    title: "Embodied ethics",
    dimensionId: "ethics-of-ai",
    levels: {
      understand: "Students are expected to develop a basic understanding of the issues underlying key ethical debates around AI, including the impact of AI on human rights, social justice, inclusion, equity and climate change within their local context and personal lives. They will have understood, internalized, and adopted the following principles in their reflective practices and uses of AI tools in their learning and beyond. // Do no harm: Students demonstrate an understanding that AI systems should not be used for purposes that might be harmful for humans (such as facial recognition for surveillance or assigning social status, or predictive algorithms for grading examinations). This includes the ability to assess whether a certain AI solution infringes upon human values and rights, particularly data privacy, and to decide on whether a particular AI method complies with global or local regulations. // Proportionality: Students develop the capacity – as appropriate for their age and ability level – to examine whether or not the use of a specific AI system is advantageous in achieving a justified aim, and whether or not a given AI method is appropriate to the context. // Non-discrimination: Students are aware of and are able to detect gender, ethnic, cultural and other biases embedded in AI tools or their outputs. Further, students are aware of AI divides within and between countries, and understand the need to make efforts to address these and ensure greater accessibility and inclusivity. // Sustainability: Students are able to explain and illustrate the implications of AI systems for environmental sustainability. // Human determination in human–AI collaboration: Students are able to demonstrate why humans should bear ethical and legal responsibilities for the use of AI; they are able to exemplify how humans can remain accountable in AI-assisted decision-making loops, rather than cede determination to machines. // Transparency and explainability:Students are aware that users are entitled to request explanatory information from designers and providers on how AI tools work, how their outputs are produced based on algorithms and models, and the degree to which the deployment and application of certain AI tools are appropriate for users of a certain age or ability level.",
    },
  },
  {
    id: "2.2",
    title: "Safe and responsible use",
    dimensionId: "ethics-of-ai",
    levels: {
      apply: "Students are expected to be able to use AI in a responsible manner in compliance with ethical principles and locally applicable regulations. They are aware of the risks of disclosing data privacy and they take measures to ensure that their data are collected, used, shared, archived and deleted only with their deliberate and informed consent. They are also aware of the specific risks of certain AI systems, and are able to protect their own safety, as well as that of their peers, when using AI.",
    },
  },
  {
    id: "2.3",
    title: "Ethics by design",
    dimensionId: "ethics-of-ai",
    level: "create",
    levels: {
      create: "Students are expected to adopt an ethics-by-design approach to the design, assessment and use of AI tools, as well as to the review and adaptation of AI regulations. Students are aware that assessing the intent behind AI design involves examining all steps of the AI life cycle, starting with the stage of conceptualization. Students should be able to assess the compliance of an AI tool with ethical regulations, as well as review AI regulations and inform adaptation.",
    },
  },
  {
    id: "3.1",
    title: "AI foundations",
    dimensionId: "ai-techniques-and-applications",
    level: "understand",
    levels: {
      understand: "Students are expected to be able to build basic knowledge and skills on AI, particularly with respect to data and algorithms, understanding the importance of the interdisciplinary foundational knowledge required to gradually deepen understanding of data and algorithms. Students should also be able to connect conceptual knowledge on AI with their activities in society and daily life, concretizing a human-centred mindset and ethical principles by understanding how AI works and how AI interacts with humans.",
    },
  },
  {
    id: "3.2",
    title: "Application skills",
    dimensionId: "ai-techniques-and-applications",
    level: "apply",
    levels: {
      apply: "Students are expected to be able to construct an age-appropriate understanding of data, AI algorithms and programming, as well as acquire transferable application skills. Students are expected to be able to critically evaluate and leverage free and/or open-source AI tools, programming libraries and datasets. ",
    },
  },
  {
    id: "3.3",
    title: "Creating AI tools",
    dimensionId: "ai-techniques-and-applications",
    level: "create",
    levels: {
      create: "Students are expected to be able to deepen and apply knowledge and skills on data and algorithms to customize existing AI toolkits to create task-based AI tools. Students are expected to integrate their human-centred mindset and ethical considerations into the assessment of existing AI resources. They are also expected to develop the social and emotional skills needed to engage in creating with AI, including through adaptivity, complex communication and teamwork skills.",
      },
    },
    {
      id: "4.1",
      title: "Problem scoping",
      dimensionId: "ai-system-design",
      level: "understand",
      levels: {
        understand: "Students are expected to be able to understand the importance of ‘AI problem scoping’ as the starting point for AI innovation. They are expected to be able to examine whether AI should be used in particular situations, from a legal, ethical and logical perspective; and to define the boundaries, goals and constraints of a problem before attempting to train an AI model to solve it. Students are also expected to acquire the knowledge and project-planning skills needed in order to conceptualize and construct an AI system, including the ability to assess the appropriateness of different AI techniques, define the need for data, and devise test and feedback metrics.",
    },
  },
  {
    id: "4.2",
    title: "Architecture design",
    dimensionId: "ai-system-design",
    level: "apply",
    levels: {
      apply: "Students are expected to be able to cultivate basic methodological knowledge and technical skills to configure a scalable, maintainable and reusable architecture for an AI system covering layers of data, algorithms, models and application interfaces. Students are expected to develop the interdisciplinary skills necessary to leverage datasets, programming tools and computational resources to construct a prototype AI system. This includes the expectation that they apply deepened human-centred values and ethical principles in their configuration, construction and optimization.",
    },
  },
  {
    id: "4.3",
    title: "Iteration and feedback loops",
    dimensionId: "ai-system-design",
    level: "create",
    levels: {
      create: "Students are expected to enhance and apply their interdisciplinary knowledge and practical methods to evaluate the appropriateness and methodological robustness of an AI model and its impact on individual users, societies and the environment. They should be able to acquire age-appropriate technical skills to improve the quality of datasets, reconfigure algorithms and enhance architectures in response to results of tests and feedback. They should be able to apply a human-centred mindset and ethical principles in simulating decision-making on when an AI system should be shut down and how its negative impact can be mitigated. They are also be expected to cultivate their identities as co-creators within the wider AI community.",
    },
  },
];

export function findDimension(dimensionId: string) {
  return frameworkDimensions.find((dimension) => dimension.id === dimensionId);
}
