// A small sample of each of the three capabilities the gap lessons need (.docs/grades-5-6.md, "What
// the platform needs"): a book lesson over a volume, a lesson whose pieces a grown-up ticks off a
// notice list, and a dictation. They live here and not in content/, since the real lessons are written
// later; the volume is the opening lines of three chapters only.

export const VOLUME = `volume willows-sample v=1 {
  title "The Wind in the Willows"
  author "Kenneth Grahame" died=1932
  published 1908
  edition "Methuen, London, 1908, the first edition, as transcribed by Project Gutenberg"
  public-domain "Grahame died in 1932, more than seventy years ago, and the book was first published in 1908, more than ninety-five years ago."
  chapter 1 "The River Bank" """
    The Mole had been working very hard all the morning,
    spring-cleaning his little home. First with brooms,
    then with dusters; then on ladders and steps and chairs,
    with a brush and a pail of whitewash; till he had dust
    in his throat and eyes, and splashes of whitewash all
    over his black fur, and an aching back and weary arms.
    """
  chapter 2 "The Open Road" """
    "Ratty," said the Mole suddenly, one bright summer
    morning, "if you please, I want to ask you a favour."
    """
  chapter 3 "The Wild Wood" """
    The Mole had long wanted to make the acquaintance
    of the Badger.
    """
}
`;

const LINE_ITEM = `item book.sample-line v=1 skills=[reading.evidence] {
  title "Which line tells you?"
  let k=0..1

  scene 34x6 {
    text ask "{pick(k, \\"Which line of chapter 1 tells you the Mole was tired?\\", \\"Which line of chapter 3 names the animal the Mole wanted to meet?\\")}" width=26 at=canvas(1, 1)
    number-input answer right-of=ask gap=1
  }

  check book.line book=willows-sample chapter="{pick(k, 1, 3)}" holds="{pick(k, \\"an aching back and weary arms\\", \\"of the Badger.\\")}"
}
`;

const REVIEW_ITEM = `item book.sample-review v=1 skills=[writing.review] {
  title "Your review"

  scene 34x22 {
    text ask "Write a paragraph for a friend: would you tell them to read this book, and why?" width=32 at=canvas(1, 1)
    writinglines rules lines=4 width=32 below=ask gap=1
  }

  check writing.by-eye look-for="A paragraph that says whether to read the book and gives a reason from the story." notice=["Says whether to read it", "Gives a reason from the story", "Names a character or a place"]
}
`;

export const BOOK_LESSON = `lesson book-sample v=1 format=book grade=5 unit=1 subject=reading book=willows-sample {
  title "The Wind in the Willows"
  goal "Read the book in two sittings and say what you thought of it."

  sitting chapters=[1, 2] {
    show book.sample-line k=0
  }
  sitting chapters=[3] {
    show book.sample-line k=1
    show book.sample-review
  }

  grown-ups "Read the chapters aloud together, or let the child read them alone."
}
`;

const RECITED = `item notice.sample-recited v=1 skills=[reading.poetry] {
  title "Say it by heart"

  scene 34x4 {
    text ask "Say the first verse of the poem to a grown-up, without the page." width=32 at=canvas(1, 1)
  }

  check reading.recited look-for="The whole verse said from memory, in its order, at a steady pace." notice=["Every line, in order", "No looking at the page", "Pauses at the line ends"]
}
`;

const SUNG = `item notice.sample-sung v=1 skills=[music.singing] {
  title "Sing the round"

  scene 34x4 {
    text ask "Sing your part of the round while your grown-up sings the other." width=32 at=canvas(1, 1)
  }

  check music.sung look-for="The child's own part held while the other part sounds against it." notice=["Came in at the right place", "Kept to their own part", "Finished together"]
}
`;

const MADE = `item notice.sample-made v=1 skills=[art.sculpture] {
  title "A figure in the round"

  scene 34x4 {
    text ask "Model an animal from clay that looks right from every side." width=32 at=canvas(1, 1)
  }

  check art.made look-for="A figure that can be walked round, with its back and sides shaped as well as its front." notice=["Shaped on every side", "Stands up by itself", "Shows how the animal moves"] ask="Which side did you make first?"
}
`;

export const NOTICE_LESSON = `lesson notice-sample v=1 format=teach grade=5 unit=8 subject=reading {
  title "Pieces a grown-up looks at"

  do {
    show notice.sample-recited
    show notice.sample-sung
    show notice.sample-made
  }
}
`;

const DICTATED = `item dictation.sample v=1 skills=[writing.spelling] {
  title "A dictation"

  scene 34x7 {
    text ask "Listen to the sentence, then type it." width=32 at=canvas(1, 1)
    number-input answer width=32 below=ask gap=1
  }

  check writing.dictation text="The Mole had been working very hard all the morning."
}
`;

export const DICTATION_LESSON = `lesson dictation-sample v=1 format=teach grade=5 unit=2 subject=writing {
  title "A dictation"

  do {
    show dictation.sample
  }
}
`;

/** Every sample, keyed as the workspace names a file. */
export const SAMPLES: Record<string, string> = {
    "books/willows-sample.lumi": VOLUME,
    "items/book-sample-line.lumi": LINE_ITEM,
    "items/book-sample-review.lumi": REVIEW_ITEM,
    "lessons/book-sample.lumi": BOOK_LESSON,
    "items/notice-sample-recited.lumi": RECITED,
    "items/notice-sample-sung.lumi": SUNG,
    "items/notice-sample-made.lumi": MADE,
    "lessons/notice-sample.lumi": NOTICE_LESSON,
    "items/dictation-sample.lumi": DICTATED,
    "lessons/dictation-sample.lumi": DICTATION_LESSON,
};
