enum ScreenName {
  Welcome = "welcome",
  Question = "question",
  Result = "result",
}

enum ScreenType {
  Presentation = "presentation",
  SingleSelect = "single-select",
  MultiSelect = "multi-select",
}

type AssessmentConfig = {
  flowBarConfig: {
    progress: boolean;
  };
  screens: {
    screenName: ScreenName;
    screenType: ScreenType;
    body: string[];
    options?: string[];
  }[];
};

export const assessmentConfig = {
  flowBarConfig: {
    progress: true,
  },
  screens: [
    {
      screenName: ScreenName.Welcome,
      screenType: ScreenType.Presentation,
      body: [
        "Welcome to the assessment, {{name}}!",
        "We are here to help you.",
        "Please answer the following {{questions}}.",
        "This assessment will help us understand your {{subtype}}.",
      ],
    },
    {
      screenName: ScreenName.Question,
      screenType: ScreenType.SingleSelect,
      body: ["What are your Symptoms?"],
      options: ["Red", "Green", "Blue"],
    },
    {
      screenName: ScreenName.Result,
      screenType: ScreenType.Presentation,
      body: ["You chose {{symptoms}} as your symptoms."],
    },
  ],
} as const satisfies AssessmentConfig;
