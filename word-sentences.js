/* ===================================================================
   WORD SENTENCES  —  carrier sentences for the Gate challenge

   The gate speaks a sentence with one word missing and shows the choices
   in writing. Because the choices are never read aloud, homophones become
   the BEST distractors here — the exact opposite of the door drill, where
   they must be banned because no voice can distinguish them.

   That inverts the authoring rule. Every sentence must carry enough
   context to pick one homophone over another with certainty:

       "She has ▢ red apples."     -> two, and only two
       "I want ▢ go outside."      -> to, and only to

   A sentence that would still read sensibly with the wrong homophone is a
   broken sentence. That is the one thing worth checking by hand.

   BLANK is written as ▢. Speech reads the sentence with the blank spoken
   as a short pause plus "something", so a child hears the shape of it.

   Distractors may come from OUTSIDE the Dolch corpus when they are
   homophones of the target — "won" is not a sight word, but it is the
   perfect wrong answer for "one".
=================================================================== */
(function (root) {
  "use strict";

  var BLANK = "\u25A2";

  /* word -> one or more carrier sentences */
  var S = {
    /* ---- the four clashes that sit INSIDE Dolch: premium gate content ---- */
    "to":    ["I want ▢ go outside.", "Give the ball ▢ me.", "We like ▢ sing."],
    "two":   ["She has ▢ red apples.", "I saw ▢ birds on the fence.", "There are ▢ cats."],
    "by":    ["The book is ▢ the door.", "Sit ▢ me on the rug.", "We walked ▢ the pond."],
    "buy":   ["I will ▢ some milk.", "Can we ▢ a new game?", "They want to ▢ bread."],
    "right": ["Turn ▢ at the corner.", "You got the answer ▢.", "My ▢ hand is up."],
    "write": ["Please ▢ your name.", "I like to ▢ stories.", "She will ▢ a letter."],
    "red":   ["The barn is ▢.", "I picked a ▢ flower.", "His hat is ▢."],
    "read":  ["I like to ▢ books.", "Can you ▢ this page?", "We ▢ every night."],

    /* ---- homophones with one member in Dolch: the partner is a distractor ---- */
    "one":   ["I have ▢ dog.", "Only ▢ apple is left.", "She ate ▢ cookie."],
    "no":    ["There is ▢ milk left.", "I have ▢ pencils.", "She said ▢ to the plan."],
    "know":  ["I ▢ the answer.", "Do you ▢ my name?", "They ▢ the way home."],
    "for":   ["This gift is ▢ you.", "We waited ▢ the bus.", "It is a book ▢ children."],
    "see":   ["I can ▢ the moon.", "Come and ▢ my drawing.", "Did you ▢ that bird?"],
    "blue":  ["The sky is ▢.", "She wore a ▢ coat.", "My favourite colour is ▢."],
    "been":  ["I have ▢ waiting.", "Where have you ▢?", "It has ▢ a long day."],
    "would": ["I ▢ like a drink.", "She ▢ help if she could.", "▢ you pass the salt?"],
    "made":  ["I ▢ a cake.", "He ▢ his bed.", "We ▢ a paper boat."],
    "some":  ["I want ▢ water.", "She has ▢ good ideas.", "Take ▢ of these."],
    "not":   ["It is ▢ cold today.", "I did ▢ hear you.", "That is ▢ mine."],
    "its":   ["The dog wagged ▢ tail.", "The tree lost ▢ leaves.", "Put the lid on ▢ jar."],
    "your":  ["Is this ▢ coat?", "Bring ▢ book to school.", "▢ shoes are by the door."],
    "here":  ["Come over ▢.", "Put the box ▢.", "I will wait ▢."],
    "eight": ["I have ▢ crayons.", "There are ▢ legs on a spider.", "She is ▢ years old."],
    "their": ["It is ▢ house.", "The children found ▢ coats.", "▢ dog is friendly."],
    "hold":  ["Please ▢ my hand.", "Can you ▢ this bag?", "▢ on tight."],

    /* ---- everyday sight words ---- */
    "and":   ["I like cats ▢ dogs.", "We ran ▢ jumped."],
    "big":   ["That is a ▢ truck.", "The tree is very ▢."],
    "can":   ["I ▢ jump high.", "▢ you help me?"],
    "come":  ["Please ▢ inside.", "Will you ▢ with us?"],
    "down":  ["The ball rolled ▢ the hill.", "Sit ▢ on the mat."],
    "find":  ["I cannot ▢ my shoe.", "Help me ▢ the cat."],
    "go":    ["We ▢ to school.", "Let us ▢ outside."],
    "help":  ["Can you ▢ me?", "I will ▢ you carry it."],
    "in":    ["The cat is ▢ the box.", "Put it ▢ your bag."],
    "is":    ["This ▢ my house.", "The sky ▢ blue."],
    "it":    ["I like ▢ very much.", "Put ▢ on the shelf."],
    "jump":  ["I can ▢ over the rope.", "Watch the frog ▢."],
    "little":["The ▢ bird sang.", "I have a ▢ brother."],
    "look":  ["▢ at the stars.", "Come and ▢ at this."],
    "make":  ["Let us ▢ a cake.", "I will ▢ my bed."],
    "my":    ["That is ▢ book.", "▢ dog is brown."],
    "play":  ["We ▢ in the yard.", "Do you want to ▢?"],
    "run":   ["I can ▢ fast.", "Watch the dog ▢."],
    "said":  ["She ▢ hello.", "He ▢ it was time."],
    "the":   ["I saw ▢ moon.", "Open ▢ door."],
    "three": ["I have ▢ pencils.", "There are ▢ chairs."],
    "up":    ["Look ▢ at the sky.", "The balloon went ▢."],
    "we":    ["▢ are going home.", "Today ▢ will bake."],
    "where": ["▢ is my hat?", "I know ▢ she lives."],
    "you":   ["Are ▢ ready?", "I made this for ▢."],
    "after": ["We eat ▢ the game.", "Come ▢ lunch."],
    "again": ["Say it ▢.", "I want to try ▢."],
    "ask":   ["Please ▢ your teacher.", "I will ▢ my mum."],
    "could": ["I ▢ hear the rain.", "▢ you open this?"],
    "every": ["I read ▢ night.", "▢ child got a turn."],
    "fly":   ["Birds ▢ south.", "Watch the kite ▢."],
    "from":  ["A letter ▢ my aunt.", "He came ▢ far away."],
    "give":  ["Please ▢ me the pen.", "I will ▢ you mine."],
    "had":   ["She ▢ a good idea.", "We ▢ eggs for breakfast."],
    "her":   ["I gave ▢ the book.", "▢ coat is red."],
    "him":   ["I saw ▢ at the park.", "Give it to ▢."],
    "his":   ["That is ▢ bike.", "▢ name is Sam."],
    "how":   ["▢ do you spell it?", "Show me ▢ it works."],
    "just":  ["I ▢ finished.", "It is ▢ right."],
    "let":   ["Please ▢ me try.", "▢ the dog outside."],
    "live":  ["We ▢ near the park.", "Fish ▢ in water."],
    "old":   ["That is an ▢ tree.", "My boots are ▢."],
    "once":  ["I went there ▢.", "▢ upon a time."],
    "open":  ["Please ▢ the window.", "The shop is ▢."],
    "over":  ["The cat jumped ▢ the wall.", "Come ▢ here."],
    "put":   ["▢ it on the table.", "Please ▢ your coat on."],
    "stop":  ["Please ▢ running.", "The bus will ▢ here."],
    "take":  ["▢ an apple with you.", "I will ▢ the bus."],
    "thank": ["I want to ▢ you.", "Please ▢ your friend."],
    "them":  ["I gave ▢ the ball.", "Tell ▢ to wait."],
    "then":  ["We ate, ▢ we played.", "First this, ▢ that."],
    "think": ["I ▢ it will rain.", "Let me ▢ about it."],
    "walk":  ["We ▢ to school.", "Let us ▢ the dog."],
    "were":  ["They ▢ very happy.", "We ▢ at the park."],
    "when":  ["▢ will you come?", "Tell me ▢ it starts."],
    "always":["I ▢ brush my teeth.", "She is ▢ kind."],
    "around":["We walked ▢ the lake.", "Look ▢ the room."],
    "because":["I stayed in ▢ it rained.", "She smiled ▢ she won."],
    "before":["Wash your hands ▢ dinner.", "I woke ▢ the sun."],
    "best":  ["This is my ▢ drawing.", "She is my ▢ friend."],
    "both":  ["I want ▢ apples.", "▢ dogs are barking."],
    "call":  ["Please ▢ your father.", "I will ▢ you later."],
    "cold":  ["The water is ▢.", "It is a ▢ morning."],
    "fast":  ["He can run ▢.", "The train is ▢."],
    "first": ["I was ▢ in line.", "This is my ▢ day."],
    "five":  ["I have ▢ fingers.", "There are ▢ birds."],
    "found": ["I ▢ my shoe.", "She ▢ a coin."],
    "gave":  ["He ▢ me a book.", "I ▢ her my pen."],
    "green": ["The grass is ▢.", "I picked a ▢ leaf."],
    "many":  ["How ▢ apples?", "There are ▢ stars."],
    "off":   ["Take your hat ▢.", "The light is ▢."],
    "pull":  ["Please ▢ the rope.", "▢ the door open."],
    "sing":  ["We ▢ every morning.", "Birds ▢ at dawn."],
    "sit":   ["Please ▢ down.", "I will ▢ here."],
    "sleep": ["I ▢ in my bed.", "The cat likes to ▢."],
    "tell":  ["Please ▢ me a story.", "I will ▢ my friend."],
    "these": ["▢ are my shoes.", "I like ▢ apples."],
    "those": ["▢ are her books.", "Look at ▢ birds."],
    "use":   ["May I ▢ your pen?", "We ▢ this every day."],
    "very":  ["It is ▢ hot.", "She was ▢ kind."],
    "wash":  ["Please ▢ your hands.", "I will ▢ the dishes."],
    "which": ["▢ one do you want?", "Tell me ▢ way to go."],
    "why":   ["▢ are you sad?", "Tell me ▢ it works."],
    "wish":  ["I ▢ for snow.", "Make a ▢."],
    "work":  ["I ▢ hard at school.", "The clock does not ▢."],
    "about": ["Tell me ▢ your day.", "The book is ▢ dogs."],
    "better":["I feel ▢ today.", "This one is ▢."],
    "bring": ["Please ▢ your book.", "I will ▢ a snack."],
    "carry": ["I can ▢ the bag.", "Please ▢ this box."],
    "clean": ["My room is ▢.", "Please ▢ the table."],
    "cut":   ["I will ▢ the paper.", "Please ▢ the cake."],
    "draw":  ["I like to ▢ cats.", "Please ▢ a circle."],
    "drink": ["I ▢ milk at lunch.", "Have a cold ▢."],
    "fall":  ["Leaves ▢ in autumn.", "Do not ▢ down."],
    "full":  ["My cup is ▢.", "The bus is ▢."],
    "grow":  ["Plants ▢ in the sun.", "I will ▢ taller."],
    "hot":   ["The soup is ▢.", "It is a ▢ day."],
    "keep":  ["Please ▢ the change.", "I will ▢ trying."],
    "kind":  ["She is very ▢.", "What ▢ of dog is it?"],
    "laugh": ["That joke made me ▢.", "We ▢ together."],
    "light": ["Turn on the ▢.", "The box is very ▢."],
    "long":  ["The rope is ▢.", "It was a ▢ day."],
    "much":  ["How ▢ does it cost?", "I like it very ▢."],
    "never": ["I ▢ eat onions.", "She is ▢ late."],
    "only":  ["I have ▢ one left.", "▢ two are missing."],
    "own":   ["This is my ▢ room.", "I have my ▢ book."],
    "pick":  ["Please ▢ a card.", "I will ▢ apples."],
    "seven": ["There are ▢ days in a week.", "I counted ▢ birds."],
    "show":  ["Please ▢ me your drawing.", "I will ▢ you how."],
    "six":   ["I have ▢ marbles.", "There are ▢ eggs."],
    "small": ["The mouse is ▢.", "I have a ▢ box."],
    "start": ["Let us ▢ now.", "The race will ▢ soon."],
    "ten":   ["I have ▢ fingers.", "Count to ▢."],
    "today": ["It is warm ▢.", "We go swimming ▢."],
    "try":   ["Please ▢ again.", "I will ▢ my best."],
    "warm":  ["The soup is ▢.", "It is a ▢ day."]
  };

  /* Homophone partners that are NOT sight words but make ideal distractors
     here, because the child reads them rather than hearing them. */
  var EXTRA_DISTRACTORS = {
    "to": ["too"], "two": ["too", "to"], "one": ["won"], "no": ["know"],
    "know": ["no"], "for": ["four"], "see": ["sea"], "blue": ["blew"],
    "been": ["bean"], "would": ["wood"], "made": ["maid"], "some": ["sum"],
    "not": ["knot"], "its": ["it's"], "your": ["you're"], "here": ["hear"],
    "eight": ["ate"], "their": ["there", "they're"], "by": ["bye"],
    "hold": ["holed"], "red": ["read"], "read": ["red", "reed"],
    "right": ["write", "rite"], "write": ["right"], "buy": ["by", "bye"]
  };

  /* ===================================================================
     INTERCHANGEABLE WORDS

     A distractor is only wrong if it is actually wrong. "We ▢ eggs for
     breakfast" takes had or has; "I have ▢ pencils" takes any number at
     all. Offering both and marking one incorrect teaches a child that
     being right is not enough, which is the worst thing this game could
     do.

     So words that can stand in the same slot are grouped, and the gate
     never offers one as a distractor for another. This is the same kind
     of rule as the homophone ban at the doors: structural, checkable,
     and not dependent on anyone remembering it.

     Grouped by what they can substitute FOR, not by part of speech —
     "red" and "green" are one group because any colour fits "The barn
     is ▢", not because they are both adjectives.
  =================================================================== */
  var INTERCHANGEABLE = [
    /* counting */
    ["one","two","three","four","five","six","seven","eight","nine","ten"],
    /* colour */
    ["red","blue","green","yellow","black","brown","white","orange"],
    /* to be */
    ["is","was","are","were","am","be","been"],
    /* to have */
    ["has","had","have"],
    /* modals */
    ["can","could","may","might","will","would","shall","should","must"],
    /* doing, in the same frame */
    ["does","did","do","done","goes","went","go"],
    /* who is doing it */
    ["i","he","she","we","they","you","it"],
    /* who it is done to */
    ["me","him","her","us","them","you","it"],
    /* whose */
    ["my","your","his","her","its","our","their"],
    /* which one */
    ["this","that","these","those"],
    /* how many, loosely */
    ["some","any","many","much","every","all","both"],
    /* where */
    ["in","on","at","by","under","over","up","down","here","there","around"],
    /* when */
    ["now","then","always","never","again","once","today","after","before","soon"],
    /* size and degree */
    ["big","little","small","long","tall","short"],
    /* how it feels */
    ["hot","cold","warm","cool"],
    /* how well */
    ["good","better","best","fast","slow"],
    /* joining words */
    ["and","or","but"],
    /* saying and asking */
    ["said","says","tell","ask"],
    /* looking */
    ["look","see","find","show"],
    /* moving on foot */
    ["run","walk","jump","fly","ride"],
    /* getting and giving */
    ["take","bring","give","get","put","keep","hold","carry","pull","pick"],
    /* making and doing */
    ["make","made","draw","write","read","sing","play","work","try","use","wash","clean","cut"],
    /* coming and going */
    ["come","came","went","go","stop","start","fall","grow"],
    /* thinking */
    ["think","know","wish","want","like","live","let","help","sleep","sit","laugh","drink","eat","open","call"],
    /* question words */
    ["how","why","when","where","which","what","who"]
  ];

  var SAME_SLOT = {};
  INTERCHANGEABLE.forEach(function (group, gi) {
    group.forEach(function (word) {
      var k = word.toLowerCase();
      SAME_SLOT[k] = SAME_SLOT[k] || [];
      SAME_SLOT[k].push(gi);
    });
  });
  function interchangeable(a, b) {
    var ga = SAME_SLOT[String(a).toLowerCase()], gb = SAME_SLOT[String(b).toLowerCase()];
    if (!ga || !gb) return false;
    for (var i = 0; i < ga.length; i++) if (gb.indexOf(ga[i]) >= 0) return true;
    return false;
  }

  root.WordSentences = {
    interchangeable: interchangeable,
    groups: INTERCHANGEABLE,
    BLANK: BLANK,
    map: S,
    extras: EXTRA_DISTRACTORS,
    has: function (w) { return Object.prototype.hasOwnProperty.call(S, w.toLowerCase()); },
    words: function () { return Object.keys(S); },
    /* pick a carrier at random so the same word is not always the same sentence */
    pick: function (w) {
      var list = S[w.toLowerCase()];
      if (!list || !list.length) return null;
      return list[Math.floor(Math.random() * list.length)];
    },
    /* Every word that must never be offered against this one. Use it when
       adding sentences: if a word in this list turns up as a choice, the
       item has two right answers. */
    rivals: function (w) {
      var out = [], k = String(w).toLowerCase();
      INTERCHANGEABLE.forEach(function (g) {
        if (g.indexOf(k) < 0) return;
        g.forEach(function (x) { if (x !== k && out.indexOf(x) < 0) out.push(x); });
      });
      var h = EXTRA_DISTRACTORS[k] || [];
      return { sameSlot: out, homophones: h.slice() };
    },
    /* what speech should read: the blank becomes a spoken placeholder */
    spoken: function (sentence) {
      return sentence.replace(BLANK, "  something  ");
    }
  };
})(typeof window !== "undefined" ? window : this);
