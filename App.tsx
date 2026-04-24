import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import { getOpenAiApiKey } from "./src/config/openai";
import { getXaiApiKey } from "./src/config/xai";
import { AlignmentLogo } from "./src/components/alignment-logo";
import { DeckFanCard } from "./src/components/deck-fan-card";
import { SigilPortrait } from "./src/components/sigil-portrait";
import { hapticError, hapticLight, hapticSuccess } from "./src/game-feedback/haptics";
import { playGameSfx, preloadGameSfx } from "./src/game-feedback/sfx";
import { ALIGNMENT_CELL_CHART_COLORS } from "./src/game/card-accent-palette";
import { getAlignmentLabel, suggestedTopics } from "./src/game/demo-boards";
import { attachPortraitsToBoard } from "./src/game/quest-portraits";
import { resolveQuestBoard } from "./src/game/resolve-quest-board";
import { createEmptyPlacements, scorePlacements } from "./src/game/scoring";
import {
  TAlignmentKey,
  TGamePhase,
  TPersonCard,
  TPlacements,
  TQuestBoard,
  TQuestScore,
  alignmentOrder,
} from "./src/game/types";
import { colors, shadow } from "./src/theme";

const CONJURE_PREVIEW_CARD_W = 108;
const CONJURE_PREVIEW_SIGIL = 50;

const columnLabels = ["Lawful", "Neutral", "Chaotic"] as const;
const rowLabels = ["Good", "Neutral", "Evil"] as const;

const SCROLL_HORIZONTAL_PAD = 32;
const BOARD_BODY_GAP = 10;
const PROMPT_PLACEHOLDER = "Star Wars, Star Trek";
const MAX_CAST_TOKENS = 9;
const SUPPORTS_NATIVE_BLUR =
  Platform.OS !== "web" &&
  // If the view manager isn't registered (e.g. no native rebuild), rendering BlurView throws.
  Boolean((require("react-native").UIManager as { getViewManagerConfig?: (name: string) => unknown }).getViewManagerConfig?.("ExpoBlurView"));

function parseCastNames(raw: string): string[] {
  const parts = raw
    .split(/[,;\n]+/g)
    .map((p) => p.trim())
    .filter(Boolean);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const name of parts) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      unique.push(name);
      seen.add(key);
    }
  }
  return unique;
}

/** 3×3 keys in row-major order (matches `rowLabels` / `columnLabels`). */
const ALIGNMENT_ROWS: TAlignmentKey[][] = [
  ["lawful-good", "neutral-good", "chaotic-good"],
  ["lawful-neutral", "true-neutral", "chaotic-neutral"],
  ["lawful-evil", "neutral-evil", "chaotic-evil"],
];

function ConjureLoader({ label }: { label: string }) {
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);

  useEffect(() => {
    const pulse = (sv: typeof a, delayMs: number) => {
      sv.value = withDelay(
        delayMs,
        withRepeat(withSequence(withTiming(1, { duration: 520 }), withTiming(0, { duration: 520 })), -1, false),
      );
    };
    pulse(a, 0);
    pulse(b, 160);
    pulse(c, 320);
  }, [a, b, c]);

  const s1 = useAnimatedStyle(() => ({
    opacity: 0.25 + a.value * 0.75,
    transform: [{ translateY: -2 * a.value }],
  }));
  const s2 = useAnimatedStyle(() => ({
    opacity: 0.25 + b.value * 0.75,
    transform: [{ translateY: -2 * b.value }],
  }));
  const s3 = useAnimatedStyle(() => ({
    opacity: 0.25 + c.value * 0.75,
    transform: [{ translateY: -2 * c.value }],
  }));

  return (
    <View style={styles.conjureLoaderRow} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={styles.conjureLoaderDots}>
        <Animated.View style={[styles.conjureLoaderDot, s1]} />
        <Animated.View style={[styles.conjureLoaderDot, s2]} />
        <Animated.View style={[styles.conjureLoaderDot, s3]} />
      </View>
      <Text style={styles.conjureLoaderLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function ShadowFigure({ size }: { size: number }) {
  const head = Math.max(10, Math.round(size * 0.28));
  const bodyW = Math.max(18, Math.round(size * 0.46));
  const bodyH = Math.max(16, Math.round(size * 0.34));

  return (
    <View style={styles.shadowFigureWrap} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View
        style={[
          styles.shadowFigureHead,
          {
            width: head,
            height: head,
            borderRadius: head / 2,
          },
        ]}
      />
      <View
        style={[
          styles.shadowFigureBody,
          {
            width: bodyW,
            height: bodyH,
            borderRadius: Math.round(bodyW * 0.22),
          },
        ]}
      />
      <View style={styles.shadowFigureGlow} />
    </View>
  );
}

function portraitProviderLabel(): string {
  const pref = process.env.EXPO_PUBLIC_PORTRAIT_PROVIDER?.trim().toLowerCase();
  const hasXai = Boolean(getXaiApiKey());
  const hasOpenAi = Boolean(getOpenAiApiKey());

  if (pref === "xai") return hasXai ? "xAI" : "xAI (missing key)";
  if (pref === "openai") return hasOpenAi ? "OpenAI" : "OpenAI (missing key)";

  if (hasXai) return "xAI";
  if (hasOpenAi) return "OpenAI";
  return "Off";
}

function App() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 720;

  const [prompt, setPrompt] = useState("");
  const [hoveredStarterPrompt, setHoveredStarterPrompt] = useState<string | null>(null);

  const promptTokens = useMemo(() => parseCastNames(prompt), [prompt]);
  const promptTokenKeys = useMemo(
    () => new Set(promptTokens.map((t) => t.toLowerCase())),
    [promptTokens],
  );
  const castCount = promptTokens.length;

  const toggleTopicToken = useCallback(
    (label: string) => {
      const key = label.toLowerCase();
      const current = parseCastNames(prompt);
      const idx = current.findIndex((t) => t.toLowerCase() === key);
      if (idx >= 0) {
        const next = [...current.slice(0, idx), ...current.slice(idx + 1)];
        setPrompt(next.join(", "));
        return;
      }
      if (current.length >= MAX_CAST_TOKENS) {
        return;
      }
      setPrompt([...current, label].join(", "));
    },
    [prompt],
  );
  const [phase, setPhase] = useState<TGamePhase>("idle");
  const [generatingSubPhase, setGeneratingSubPhase] = useState<"draft" | "portraits">("draft");
  const [generatingPreviewBoard, setGeneratingPreviewBoard] = useState<TQuestBoard | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string>("Preparing…");
  const [board, setBoard] = useState<TQuestBoard | null>(null);
  const [placements, setPlacements] = useState<TPlacements>(() => createEmptyPlacements());
  const [submittedPlacements, setSubmittedPlacements] = useState<TPlacements | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [deckFrontPersonId, setDeckFrontPersonId] = useState<string | null>(null);
  const [score, setScore] = useState<TQuestScore | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [inspectOpen, setInspectOpen] = useState(false);

  const pendingPromptRef = useRef("");
  const promptInputRef = useRef<React.ElementRef<typeof TextInput> | null>(null);
  const pendingQuestOptsRef = useRef<{ requiredNames?: string[]; randomSeed?: string; forceLlm?: boolean } | undefined>(
    undefined,
  );
  const cellMeasureRefs = useRef<Partial<Record<TAlignmentKey, React.ElementRef<typeof View> | null>>>({});
  const cellRects = useRef<Partial<Record<TAlignmentKey, { x: number; y: number; width: number; height: number }>>>({});
  const deckShake = useSharedValue(0);
  const scoreBurst = useSharedValue(1);
  const conjureCarouselRef = useRef<ScrollView>(null);
  const deckFanScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    void preloadGameSfx();
  }, []);

  useEffect(() => {
    if (phase !== "generating" || generatingSubPhase !== "portraits" || !generatingPreviewBoard) {
      return;
    }
    const id = requestAnimationFrame(() => {
      conjureCarouselRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(id);
  }, [generatingPreviewBoard, generatingSubPhase, phase]);

  useEffect(() => {
    if (phase !== "generating") {
      return;
    }

    setGeneratingSubPhase("draft");
    setGeneratingPreviewBoard(null);
    setGenerationStatus("Drafting the quest…");

    let cancelled = false;
    const topic = pendingPromptRef.current;

    void (async () => {
      try {
        setGenerationStatus(getOpenAiApiKey() ? "Summoning the cast of nine…" : "Searching starter realms…");
        const nextBoard = await resolveQuestBoard(topic, pendingQuestOptsRef.current);
        if (cancelled) {
          return;
        }
        setGenerationStatus("Binding the fates…");
        if (!getOpenAiApiKey()) {
          setBoard(nextBoard);
          setPlacements(createEmptyPlacements());
          setSubmittedPlacements(null);
          setSelectedPersonId(null);
          setScore(null);
          setPrompt("");
          setPhase("sorting");
          return;
        }
        setGeneratingSubPhase("portraits");
        setGeneratingPreviewBoard(nextBoard);
        setGenerationStatus(`Painting portraits (${portraitProviderLabel()})…`);
        const withPortraits = await attachPortraitsToBoard(nextBoard, {
          onPersonUpdated: ({ board: b, person }) => {
            if (!cancelled) {
              setGeneratingPreviewBoard(b);
              setGenerationStatus(`Painting: ${person.name}`);
            }
          },
        });
        if (cancelled) {
          return;
        }
        setBoard(withPortraits);
        setGeneratingPreviewBoard(null);
        setPlacements(createEmptyPlacements());
        setSubmittedPlacements(null);
        setSelectedPersonId(null);
        setScore(null);
        setPrompt("");
        setPhase("sorting");
      } catch (err) {
        if (cancelled) {
          return;
        }
        setGeneratingPreviewBoard(null);
        const message = err instanceof Error ? err.message : String(err);
        setGenerationError(message);
        setPhase("idle");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [phase]);

  const peopleById = useMemo(() => {
    return Object.fromEntries((board?.palette ?? []).map((person) => [person.id, person]));
  }, [board]);

  /** After submit, the grid shows the correct person per cell (answer key), not the user’s wrong picks. */
  const currentPlacements = phase === "revealed" && board ? board.answerKey : placements;

  const unplacedPeople = useMemo(() => {
    if (!board) {
      return [];
    }
    const placedIds = new Set(Object.values(placements).filter(Boolean));
    return board.palette.filter((person) => !placedIds.has(person.id));
  }, [board, placements]);

  /** Cards shown in the hand while sorting (full palette when none left in hand, so you can re-pick). */
  const sortingDeckPeople = useMemo(() => {
    if (!board || phase !== "sorting") {
      return [];
    }
    return unplacedPeople.length ? unplacedPeople : board.palette;
  }, [board, phase, unplacedPeople]);

  const selectedPerson = selectedPersonId && board ? (peopleById[selectedPersonId] ?? null) : null;

  const inspectRoster = board?.palette ?? [];
  const inspectIndex = useMemo(() => {
    if (!selectedPersonId) return -1;
    return inspectRoster.findIndex((p) => p.id === selectedPersonId);
  }, [inspectRoster, selectedPersonId]);

  const cycleInspect = useCallback(
    (dir: -1 | 1) => {
      if (!inspectRoster.length) return;
      const idx = inspectIndex >= 0 ? inspectIndex : 0;
      const next = (idx + dir + inspectRoster.length) % inspectRoster.length;
      const nextPerson = inspectRoster[next];
      if (nextPerson) {
        setSelectedPersonId(nextPerson.id);
      }
    },
    [inspectIndex, inspectRoster],
  );

  const canSubmit =
    phase === "sorting" &&
    board &&
    Object.values(placements).every((placement) => placement !== null);

  const remainingCount = unplacedPeople.length;
  const progressRatio = board ? (board.palette.length - remainingCount) / board.palette.length : 0;

  const conjuringPortraitDone = generatingPreviewBoard?.palette.filter((p) => p.portraitUri).length ?? 0;
  const conjuringPortraitTotal = generatingPreviewBoard?.palette.length ?? 0;
  const conjureProgressValue =
    generatingSubPhase === "draft" || !generatingPreviewBoard
      ? 0.12
      : 0.12 + 0.88 * (conjuringPortraitTotal > 0 ? conjuringPortraitDone / conjuringPortraitTotal : 0);

  /** Keep the 3×3 chart centered as a single unit instead of letting row labels absorb leftover width. */
  const boardLayout = useMemo(() => {
    const inner = Math.max(0, width - SCROLL_HORIZONTAL_PAD - insets.left - insets.right);
    const rowLabelWidth = inner < 340 ? 46 : 58;
    const cellGap = inner < 340 ? 6 : 8;
    const maxCell = isTablet ? 104 : 82;
    const availableCell = Math.floor((inner - rowLabelWidth - BOARD_BODY_GAP - 2 * cellGap) / 3);
    const cell = Math.max(48, Math.min(maxCell, availableCell));
    const gridWidth = cell * 3 + cellGap * 2;
    const boardWidth = rowLabelWidth + BOARD_BODY_GAP + gridWidth;
    const sigilSize = Math.round(Math.min(isTablet ? 72 : 54, cell * 0.58));
    return { rowLabelWidth, cell, cellGap, gridWidth, boardWidth, sigilSize };
  }, [width, insets.left, insets.right, isTablet]);

  const deckFanMetrics = useMemo(() => {
    const inner = Math.max(0, width - SCROLL_HORIZONTAL_PAD - insets.left - insets.right);
    const n = Math.max(1, sortingDeckPeople.length);
    let cardW = Math.min(108, Math.max(76, Math.round(inner * 0.26)));
    let overlap = Math.floor((inner - cardW - 8) / Math.max(1, n - 1));
    overlap = Math.max(20, Math.min(48, overlap));
    let span = cardW + (n - 1) * overlap;
    if (span > inner && n > 1) {
      overlap = Math.max(16, Math.floor((inner - cardW - 4) / (n - 1)));
      span = cardW + (n - 1) * overlap;
    }
    if (span > inner) {
      cardW = Math.max(68, inner - (n - 1) * overlap);
    }
    const maxTilt = n <= 1 ? 0 : Math.min(16, 5 + n * 0.9);
    const sigilSize = Math.round(Math.min(56, cardW * 0.52));
    const cardBodyMinH = sigilSize + 52;
    const fanSpan = cardW + (n - 1) * Math.max(0, cardW - overlap);
    return { inner, cardW, overlap, maxTilt, sigilSize, cardBodyMinH, fanSpan };
  }, [width, insets.left, insets.right, sortingDeckPeople.length]);

  const commitPlacement = useCallback(
    (personId: string, targetAlignment: TAlignmentKey) => {
      if (phase !== "sorting") {
        return;
      }
      setSelectedPersonId(null);
      setPlacements((current) => {
        const next = { ...current };
        const originCell = Object.entries(current).find(([, id]) => id === personId)?.[0] as TAlignmentKey | undefined;
        const targetOccupant = current[targetAlignment];
        if (originCell) {
          next[originCell] = targetOccupant ?? null;
        }
        next[targetAlignment] = personId;
        return next;
      });
    },
    [phase],
  );

  const triggerDeckMiss = useCallback(() => {
    deckShake.value = withSequence(
      withTiming(-7, { duration: 36 }),
      withTiming(7, { duration: 36 }),
      withTiming(-4, { duration: 28 }),
      withTiming(4, { duration: 28 }),
      withTiming(0, { duration: 24 }),
    );
  }, [deckShake]);

  const measureAllCells = useCallback((): Promise<void> => {
    return Promise.all(
      alignmentOrder.map(
        (k) =>
          new Promise<void>((resolve) => {
            const node = cellMeasureRefs.current[k];
            if (!node) {
              resolve();
              return;
            }
            node.measureInWindow((x, y, w, h) => {
              cellRects.current[k] = { x, y, width: w, height: h };
              resolve();
            });
          }),
      ),
    ).then(() => {});
  }, []);

  const hitTest = useCallback((px: number, py: number): TAlignmentKey | null => {
    for (const key of alignmentOrder) {
      const r = cellRects.current[key];
      if (!r || r.width <= 0 || r.height <= 0) {
        continue;
      }
      if (px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height) {
        return key;
      }
    }
    return null;
  }, []);

  const handleDeckDragBegin = useCallback(() => {
    setScrollLocked(true);
    void playGameSfx("tap");
    hapticLight();
  }, []);

  const handleDeckDragEnd = useCallback(
    (personId: string) => (absoluteX: number, absoluteY: number) => {
      setScrollLocked(false);
      void measureAllCells().then(() => {
        const hit = hitTest(absoluteX, absoluteY);
        if (hit) {
          commitPlacement(personId, hit);
          void playGameSfx("place");
          hapticSuccess();
        } else {
          triggerDeckMiss();
          void playGameSfx("tap");
          hapticError();
        }
      });
    },
    [measureAllCells, hitTest, commitPlacement, triggerDeckMiss],
  );

  const deckShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: deckShake.value }],
  }));

  const scoreBurstStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreBurst.value }],
  }));

  useEffect(() => {
    if (phase === "revealed" && score) {
      scoreBurst.value = 0.88;
      scoreBurst.value = withSpring(1, { damping: 13, stiffness: 210 });
    }
  }, [phase, score, scoreBurst]);

  const beginQuestGeneration = useCallback(() => {
    // Blur the prompt field so its caret doesn't linger over the loading card (notably on iOS/web).
    promptInputRef.current?.blur();
    Keyboard.dismiss();

    const typed = prompt.trim();
    // If the user hasn't typed or picked anything, honor the placeholder as the default topic.
    const effective = typed.length ? typed : PROMPT_PLACEHOLDER;
    const tokens = parseCastNames(effective).slice(0, MAX_CAST_TOKENS);

    if (!tokens.length) {
      pendingPromptRef.current = "Surprise me (random cast)";
      pendingQuestOptsRef.current = { randomSeed: String(Date.now()), forceLlm: true };
    } else {
      pendingPromptRef.current = tokens.join(", ");
      pendingQuestOptsRef.current = undefined;
    }
    setGenerationError(null);
    setPhase("generating");
  }, [prompt]);

  const backToStart = () => {
    setBoard(null);
    setPlacements(createEmptyPlacements());
    setSubmittedPlacements(null);
    setSelectedPersonId(null);
    setScore(null);
    setScrollLocked(false);
    setGenerationError(null);
    setPhase("idle");
  };

  const cancelQuest = () => {
    hapticLight();
    backToStart();
  };

  const handleSelectPerson = (personId: string) => {
    hapticLight();
    setSelectedPersonId((current) => (current === personId ? null : personId));
  };

  const handlePlaceSelected = (targetAlignment: TAlignmentKey) => {
    if (!selectedPersonId || phase !== "sorting") {
      return;
    }
    const id = selectedPersonId;
    commitPlacement(id, targetAlignment);
    void playGameSfx("place");
    hapticLight();
  };

  const handleClearCell = (targetAlignment: TAlignmentKey) => {
    if (phase !== "sorting") {
      return;
    }
    hapticLight();
    setPlacements((current) => ({
      ...current,
      [targetAlignment]: null,
    }));
  };

  const submitBoard = () => {
    if (!board || !canSubmit) {
      return;
    }

    const nextScore = scorePlacements({
      answerKey: board.answerKey,
      guesses: placements,
    });

    setSubmittedPlacements(placements);
    setScore(nextScore);
    setSelectedPersonId(null);
    setPhase("revealed");
    void playGameSfx("score");
    hapticSuccess();
  };

  const playAgain = () => {
    if (!board) {
      return;
    }
    setPlacements(createEmptyPlacements());
    setSubmittedPlacements(null);
    setSelectedPersonId(null);
    setScore(null);
    setPhase("sorting");
  };

  return (
    <View style={styles.appShell}>
      <StatusBar style="light" />

      <PersonInspectModal
        open={inspectOpen && phase === "sorting" && Boolean(selectedPerson)}
        person={selectedPerson}
        onClose={() => setInspectOpen(false)}
        onPrev={() => cycleInspect(-1)}
        onNext={() => cycleInspect(1)}
      />

      <View style={[styles.topBar, { paddingTop: insets.top, backgroundColor: "#000000" }]}>
        <View style={styles.topBarRow}>
          <AlignmentLogo size={44} />
          <View style={styles.topBarTitles}>
            <Text style={styles.brandTitle} numberOfLines={1}>
              Alignment Quest
            </Text>
            <Text style={styles.brandTagline} numberOfLines={1}>
              Nine souls · one chart
            </Text>
          </View>
          {phase !== "idle" ? (
            <Pressable
              onPress={cancelQuest}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Cancel quest and return to topic picker"
              style={({ pressed }) => [styles.topBarCancel, pressed ? styles.pressed : undefined]}
            >
              <Text style={styles.topBarCancelText}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        scrollEnabled={!scrollLocked}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      >
        {phase === "idle" ? (
          <View style={styles.sectionStack}>
            <GlassCard>
              {generationError ? (
                <View style={styles.generationErrorBox}>
                  <Text style={styles.generationErrorTitle}>The augury falters</Text>
                  <Text style={styles.generationErrorBody}>{generationError}</Text>
                  <Pressable
                    onPress={() => setGenerationError(null)}
                    style={({ pressed }) => [styles.generationErrorDismiss, pressed ? styles.pressed : undefined]}
                  >
                    <Text style={styles.generationErrorDismissText}>Dismiss</Text>
                  </Pressable>
                </View>
              ) : null}

              <Text style={styles.idleTitle}>Name thy cast</Text>

              <Text style={styles.idleInputHint}>Type your own, comma‑separated — or tap realms below.</Text>
              <View style={[styles.questInputRow, styles.idleQuestInput]}>
                <TextInput
                  ref={promptInputRef}
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder={PROMPT_PLACEHOLDER}
                  placeholderTextColor={colors.parchmentMuted}
                  style={[styles.questInput, styles.questInputFlex]}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                />
                {prompt.trim().length ? (
                  <Pressable
                    onPress={() => {
                      setPrompt("");
                      setGenerationError(null);
                      void playGameSfx("tap");
                      hapticLight();
                    }}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Clear custom topic"
                    style={({ pressed }) => [styles.questInputClear, pressed ? styles.pressed : undefined]}
                  >
                    <Text style={styles.questInputClearText}>×</Text>
                  </Pressable>
                ) : null}
              </View>
              <PrimaryButton label="Conjure" onPress={beginQuestGeneration} />

              <View style={styles.starterHeadRow}>
                <Text style={[styles.idleSectionLabel, styles.idleStartersLabel]}>Realms</Text>
                <View
                  style={styles.pipRow}
                  accessibilityLabel={`${castCount} of ${MAX_CAST_TOKENS} cast slots filled`}
                >
                  {Array.from({ length: MAX_CAST_TOKENS }, (_, i) => (
                    <View
                      key={i}
                      style={[styles.pip, i < castCount ? styles.pipFilled : undefined]}
                    />
                  ))}
                </View>
              </View>
              <View style={styles.topicGrid}>
                {suggestedTopics.map((topic) => {
                  const selected = promptTokenKeys.has(topic.label.toLowerCase());
                  const atLimit = !selected && castCount >= MAX_CAST_TOKENS;
                  const hovered = hoveredStarterPrompt === topic.prompt;
                  return (
                    <Pressable
                      key={topic.label}
                      accessibilityRole="button"
                      accessibilityLabel={topic.label}
                      accessibilityState={{ selected }}
                      onHoverIn={() => setHoveredStarterPrompt(topic.prompt)}
                      onHoverOut={() => setHoveredStarterPrompt((v) => (v === topic.prompt ? null : v))}
                      onPressIn={() => {
                        if (atLimit) {
                          void playGameSfx("tap");
                          hapticError();
                          return;
                        }
                        void playGameSfx("tap");
                        hapticLight();
                      }}
                      onPress={() => {
                        setGenerationError(null);
                        toggleTopicToken(topic.label);
                      }}
                      disabled={atLimit}
                      style={({ pressed }) => [
                        styles.topicCard,
                        shadow.card,
                        { flexBasis: isTablet ? "31%" : "47%" },
                        selected ? styles.topicCardSelected : undefined,
                        atLimit ? styles.topicCardDisabled : undefined,
                        hovered && !selected && !atLimit ? styles.topicCardHovered : undefined,
                        pressed ? styles.topicCardPressed : undefined,
                      ]}
                    >
                      <Text style={styles.topicEmoji}>{topic.emoji}</Text>
                      <Text style={styles.topicCardLabel} numberOfLines={1}>
                        {topic.label}
                      </Text>
                      {selected ? (
                        <View style={styles.topicCheckBadge} pointerEvents="none">
                          <Text style={styles.topicCheckMark}>✓</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </GlassCard>
          </View>
        ) : null}

        {phase === "generating" ? (
          <View style={styles.sectionStack}>
            <GlassCard style={styles.emptyQuestCard}>
              <Text style={styles.emptyQuestTitle}>Conjuring…</Text>
              <ConjureLoader label={generationStatus} />
              {generatingSubPhase === "draft" ? (
                <>
                  <Text style={styles.emptyQuestBody}>Drafting the quest…</Text>
                  <Text style={styles.emptyQuestSub}>Asking the model for your cast of nine.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyQuestBody}>Painting portraits</Text>
                  <Text style={styles.emptyQuestSub}>
                    {conjuringPortraitDone} / {Math.max(1, conjuringPortraitTotal)} ready
                  </Text>
                </>
              )}
              {generatingSubPhase === "portraits" && generatingPreviewBoard?.title ? (
                <Text style={styles.conjureDeckTitle} numberOfLines={2}>
                  {generatingPreviewBoard.title}
                </Text>
              ) : null}
              <ProgressBar value={conjureProgressValue} />
              {generatingSubPhase === "portraits" && generatingPreviewBoard ? (
                <ScrollView
                  ref={conjureCarouselRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.conjureCarouselContent}
                  style={styles.conjureCarousel}
                >
                  {generatingPreviewBoard.palette.map((person) => (
                    <View key={person.id} style={[styles.conjurePreviewCard, { width: CONJURE_PREVIEW_CARD_W }]}>
                      <Text style={styles.conjurePreviewName} numberOfLines={2}>
                        {person.name}
                      </Text>
                      <View style={[styles.conjurePreviewArt, { backgroundColor: `${person.accent}22` }]}>
                        {person.portraitUri ? (
                          <SigilPortrait
                            personId={person.id}
                            accent={person.accent}
                            size={CONJURE_PREVIEW_SIGIL}
                            accessibilityLabel={person.name}
                            portraitUri={person.portraitUri}
                          />
                        ) : (
                          <ShadowFigure size={CONJURE_PREVIEW_SIGIL} />
                        )}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </GlassCard>
          </View>
        ) : null}

        {(phase === "sorting" || phase === "revealed") && board ? (
          <View style={styles.sectionStack}>
            <View style={styles.boardWrap}>
              <View style={[styles.boardFrame, { width: boardLayout.boardWidth }]}>
                <View style={[styles.columnHeaderRow, { paddingLeft: boardLayout.rowLabelWidth + BOARD_BODY_GAP }]}>
                  <View style={[styles.boardHeaderCells, { width: boardLayout.gridWidth, gap: boardLayout.cellGap }]}>
                    {columnLabels.map((label) => (
                      <Text key={label} style={[styles.axisLabelColumn, { width: boardLayout.cell }]}>
                        {label}
                      </Text>
                    ))}
                  </View>
                </View>

                {ALIGNMENT_ROWS.map((rowAlignments, rowIndex) => (
                  <View key={rowLabels[rowIndex]} style={[styles.boardBodyRow, { gap: BOARD_BODY_GAP }]}>
                    <Text
                      style={[styles.axisLabelRow, { width: boardLayout.rowLabelWidth }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {rowLabels[rowIndex]}
                    </Text>
                    <View style={[styles.boardGridRow, { width: boardLayout.gridWidth, gap: boardLayout.cellGap }]}>
                      {rowAlignments.map((alignment) => {
                        const personId = currentPlacements[alignment];
                        const person = personId ? peopleById[personId] : null;
                        const submittedPersonId = submittedPlacements?.[alignment] ?? null;
                        const guessedCorrectly =
                          phase === "revealed" && submittedPersonId === board.answerKey[alignment];

                        return (
                          <View
                            key={alignment}
                            ref={(el) => {
                              cellMeasureRefs.current[alignment] = el;
                            }}
                            collapsable={false}
                            style={{ width: boardLayout.cell, height: boardLayout.cell }}
                          >
                            <Pressable
                              onPress={() => {
                                if (selectedPersonId && phase === "sorting" && personId === selectedPersonId) {
                                  handleClearCell(alignment);
                                  return;
                                }
                                if (selectedPersonId && phase === "sorting") {
                                  handlePlaceSelected(alignment);
                                  return;
                                }
                                if (personId) {
                                  handleSelectPerson(personId);
                                }
                              }}
                              style={({ pressed }) => [
                                styles.boardCell,
                                { width: boardLayout.cell, height: boardLayout.cell },
                                person ? styles.boardCellFilled : styles.boardCellEmpty,
                                !person
                                  ? {
                                      borderColor: `${ALIGNMENT_CELL_CHART_COLORS[alignment]}dd`,
                                      backgroundColor: `${ALIGNMENT_CELL_CHART_COLORS[alignment]}22`,
                                    }
                                  : undefined,
                                person
                                  ? {
                                      borderStyle: "solid",
                                      borderColor: `${ALIGNMENT_CELL_CHART_COLORS[alignment]}ee`,
                                    }
                                  : undefined,
                                phase === "revealed" && submittedPersonId && guessedCorrectly
                                  ? styles.boardCellCorrect
                                  : undefined,
                                phase === "revealed" && submittedPersonId && !guessedCorrectly
                                  ? styles.boardCellMiss
                                  : undefined,
                                pressed ? styles.pressed : undefined,
                              ]}
                            >
                              {person ? (
                                <View style={styles.boardCardFill}>
                                  <SigilPortrait
                                    personId={person.id}
                                    accent={person.accent}
                                    size={boardLayout.sigilSize}
                                    accessibilityLabel={person.name}
                                    portraitUri={person.portraitUri}
                                  />
                                  <Text style={styles.boardCardName} numberOfLines={2}>
                                    {person.name}
                                  </Text>
                                  <Text style={styles.boardCardRole} numberOfLines={1}>
                                    {person.role}
                                  </Text>
                                  {phase === "revealed" ? (
                                    <Text style={styles.boardCardReveal}>
                                      {submittedPersonId && guessedCorrectly ? "Match" : "—"}
                                    </Text>
                                  ) : null}
                                </View>
                              ) : (
                                <View
                                  style={[
                                    styles.boardCellEmptyState,
                                    {
                                      shadowColor: ALIGNMENT_CELL_CHART_COLORS[alignment],
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.boardCellPlus,
                                      { color: ALIGNMENT_CELL_CHART_COLORS[alignment] },
                                    ]}
                                  >
                                    +
                                  </Text>
                                </View>
                              )}
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {board.title ? (
              <Text style={styles.topicLine} numberOfLines={2}>
                {board.title}
              </Text>
            ) : null}

            {phase === "sorting" ? (
              <View style={styles.progressHead}>
                <Text style={styles.progressEyebrow}>{remainingCount} cards left</Text>
                <ProgressBar value={progressRatio} />
              </View>
            ) : null}

            {selectedPerson && phase === "sorting" ? (
              <Pressable
                onPress={() => setInspectOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Open selected card details"
                style={({ pressed }) => [pressed ? styles.pressed : undefined]}
              >
                <GlassCard style={styles.selectedCard} accentColor={selectedPerson.accent}>
                  <Text style={styles.selectedLabel}>Selected</Text>
                  <View style={styles.selectedRow}>
                    <SigilPortrait
                      personId={selectedPerson.id}
                      accent={selectedPerson.accent}
                      size={52}
                      accessibilityLabel={selectedPerson.name}
                      portraitUri={selectedPerson.portraitUri}
                    />
                    <Text style={styles.selectedText}>
                      {selectedPerson.name} — {selectedPerson.role}
                    </Text>
                  </View>
                </GlassCard>
              </Pressable>
            ) : null}

            {phase === "sorting" ? (
              <View style={styles.deckSection}>
                <View style={[styles.deckFanOuter, { minHeight: deckFanMetrics.cardBodyMinH + 56 }]}>
                  <Animated.View style={[deckShakeStyle, { width: "100%" }]}>
                    <ScrollView
                      ref={deckFanScrollRef}
                      horizontal
                      nestedScrollEnabled
                      removeClippedSubviews={false}
                      showsHorizontalScrollIndicator={false}
                      style={[
                        styles.deckFanScroller,
                        { width: "100%", height: deckFanMetrics.cardBodyMinH + 56, overflow: "visible" },
                      ]}
                      contentContainerStyle={[
                        styles.deckFanScrollContent,
                        { minWidth: deckFanMetrics.inner, paddingHorizontal: 8 },
                      ]}
                    >
                      <View style={styles.deckFanRow}>
                        {sortingDeckPeople.map((person, i) => {
                          const n = sortingDeckPeople.length;
                          const selected = selectedPersonId === person.id;
                          const front = deckFrontPersonId === person.id;
                          const mid = (n - 1) / 2;
                          const t = n <= 1 ? 0 : (i / (n - 1)) * 2 - 1;
                          const tiltDeg = t * deckFanMetrics.maxTilt;
                          // Lift the center of the fan (edges sit lower).
                          const liftPx = n <= 1 ? 0 : (1 - Math.abs(t)) * 12;

                          return (
                            <DeckFanCard
                              key={person.id}
                              person={person}
                              cardW={deckFanMetrics.cardW}
                              marginLeft={i === 0 ? 0 : -deckFanMetrics.overlap}
                              zIndex={selected || front ? 300 : Math.round(100 - Math.abs(i - mid))}
                              minHeight={deckFanMetrics.cardBodyMinH}
                              sigilSize={deckFanMetrics.sigilSize}
                              tiltDeg={tiltDeg}
                              liftPx={liftPx}
                              active={selected}
                              bringToFront={selected || front}
                              onFrontBegin={() => setDeckFrontPersonId(person.id)}
                              onFrontEnd={() =>
                                setDeckFrontPersonId((current) => (current === person.id && !selected ? null : current))
                              }
                              onTap={() => handleSelectPerson(person.id)}
                              onDragBegin={handleDeckDragBegin}
                              onDragEnd={handleDeckDragEnd(person.id)}
                            />
                          );
                        })}
                      </View>
                    </ScrollView>
                  </Animated.View>
                </View>
              </View>
            ) : null}

            {phase === "sorting" ? (
              <View style={styles.questActions}>
                <PrimaryButton label="Score" onPress={submitBoard} disabled={!canSubmit} />
              </View>
            ) : null}
          </View>
        ) : null}

        {phase === "revealed" && board && score ? (
          <View style={styles.sectionStack}>
            <Animated.View style={scoreBurstStyle}>
              <GlassCard accentColor={colors.lawful}>
                <Text style={styles.resultTitle}>Score</Text>
                <Text style={styles.resultPoints}>
                  {score.points} / 9
                </Text>
                <Text style={styles.resultSub}>One point for each person on the right alignment.</Text>
              </GlassCard>
            </Animated.View>

            <Text style={styles.resultsSubhead}>Answer key</Text>
            <Text style={styles.answerKeyCaption}>
              {"Stripe and alignment label use the same slot colors as the grid chart."}
            </Text>
            <View style={styles.answerKeyList}>
              {alignmentOrder.map((alignment) => {
                const personId = board.answerKey[alignment];
                const detail = score.details.find((d) => d.alignment === alignment);
                const exact = detail?.correct ?? false;
                const person = personId ? (peopleById[personId] ?? null) : null;
                const slotColor = ALIGNMENT_CELL_CHART_COLORS[alignment];

                return (
                  <View key={alignment} style={styles.answerKeyRow}>
                    <View style={[styles.answerKeySlotStripe, { backgroundColor: slotColor }]} />
                    <View style={styles.answerKeyRowMain}>
                      {person ? (
                        <SigilPortrait
                          personId={person.id}
                          accent={person.accent}
                          size={30}
                          accessibilityLabel={person.name}
                          portraitUri={person.portraitUri}
                        />
                      ) : (
                        <View style={styles.answerKeyPortraitPlaceholder}>
                          <Text style={styles.answerKeyPortraitPlaceholderText}>—</Text>
                        </View>
                      )}
                      <View style={styles.answerKeyTexts}>
                        <Text style={styles.answerKeyName} numberOfLines={1}>
                          {person?.name ?? "—"}
                        </Text>
                        {person?.role ? (
                          <Text style={styles.answerKeyRole} numberOfLines={1}>
                            {person.role}
                          </Text>
                        ) : null}
                        <Text style={[styles.answerKeyAlignment, { color: slotColor }]}>
                          {getAlignmentLabel(alignment)}
                        </Text>
                      </View>
                      <View style={[styles.answerKeyBadge, exact ? styles.answerKeyBadgeHit : styles.answerKeyBadgeMiss]}>
                        <Text
                          style={[
                            styles.answerKeyBadgeText,
                            { color: exact ? colors.good : colors.evil },
                          ]}
                        >
                          {exact ? "OK" : "miss"}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <PrimaryButton label="Play again" onPress={playAgain} />
            <SecondaryButton label="New quest" onPress={backToStart} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function GlassCard({
  children,
  style,
  accentColor,
}: {
  children: React.ReactNode;
  style?: object;
  accentColor?: string;
}) {
  return (
    <View
      style={[
        styles.glassCard,
        shadow.panel,
        style,
        accentColor
          ? {
              borderColor: `${accentColor}66`,
              shadowColor: accentColor,
            }
          : null,
      ]}
    >
      {children}
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(4, Math.min(100, value * 100))}%` }]} />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (disabled) return;
        void playGameSfx("tap");
        hapticLight();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.primaryButtonPressable,
        disabled ? styles.primaryButtonDisabled : null,
        pressed && !disabled ? styles.primaryButtonPressed : null,
      ]}
    >
      {({ pressed }) => (
        <View
          pointerEvents="none"
          style={[
            styles.primaryButtonBody,
            disabled ? styles.primaryButtonBodyDisabled : null,
            pressed && !disabled ? styles.primaryButtonBodyPressed : null,
          ]}
        >
          <View pointerEvents="none" style={styles.primaryButtonHighlight} />
          <View pointerEvents="none" style={styles.primaryButtonBevel} />
          <Text style={styles.primaryButtonText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : undefined]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function alignmentToCellHint(alignment: TAlignmentKey): { headline: string; body: string } {
  const parts = alignment.split("-");
  const ethic = parts[0] ?? "neutral";
  const moral = parts[1] ?? "neutral";
  const cap = (value: string, fallback: string) => {
    if (!value) return fallback;
    return value[0] ? value[0].toUpperCase() + value.slice(1) : fallback;
  };

  const ethicLabel = ethic === "true" ? "Neutral" : cap(ethic, "Neutral");
  const moralLabel = cap(moral, "Neutral");

  if (alignment === "true-neutral") {
    return {
      headline: "My gut: dead center.",
      body: "Leans Neutral on both axes—if any square feels like the calm eye of the storm, it’s that one.",
    };
  }

  return {
    headline: `My gut: ${ethicLabel} × ${moralLabel}.`,
    body: `Likely sits in the ${moralLabel} row and the ${ethicLabel} column (but trust your table instincts).`,
  };
}

function PersonInspectModal({
  open,
  person,
  onClose,
  onPrev,
  onNext,
}: {
  open: boolean;
  person: TPersonCard | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!person) return null;
  const hint = alignmentToCellHint(person.alignment);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.inspectBackdrop}>
        {!SUPPORTS_NATIVE_BLUR ? <View pointerEvents="none" style={styles.inspectWebBlurFallback} /> : null}
        {SUPPORTS_NATIVE_BLUR ? (
          <BlurView pointerEvents="none" intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
        ) : null}

        <View style={styles.inspectSheet}>
          <View style={styles.inspectTopRow}>
            <View style={styles.inspectTitleBlock}>
              <Text style={styles.inspectName} numberOfLines={1}>
                {person.name}
              </Text>
              <Text style={styles.inspectRole} numberOfLines={2}>
                {person.role}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel="Close card preview"
              style={({ pressed }) => [styles.inspectClose, pressed ? styles.pressed : undefined]}
            >
              <Text style={styles.inspectCloseText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.inspectPortraitWrap}>
            <View style={[styles.inspectPortraitFrame, { borderColor: `${person.accent}66` }]}>
              <SigilPortrait
                personId={person.id}
                accent={person.accent}
                size={224}
                accessibilityLabel={person.name}
                portraitUri={person.portraitUri}
              />
            </View>
          </View>

          <GlassCard style={styles.inspectHintCard} accentColor={person.accent}>
            <Text style={styles.inspectHintHeadline}>{hint.headline}</Text>
            <Text style={styles.inspectHintBody}>{hint.body}</Text>
            {person.hint ? <Text style={styles.inspectHintBodyMuted}>{person.hint}</Text> : null}
            {person.clueTags?.length ? (
              <View style={styles.inspectTagsRow}>
                {(person.clueTags ?? []).slice(0, 5).map((tag: string) => (
                  <View key={tag} style={styles.inspectTag}>
                    <Text style={styles.inspectTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </GlassCard>

          <View style={styles.inspectControls}>
            <Pressable
              onPress={onPrev}
              accessibilityRole="button"
              accessibilityLabel="Previous card"
              style={({ pressed }) => [styles.inspectControlBtn, pressed ? styles.pressed : undefined]}
            >
              <Text style={styles.inspectControlText}>Prev</Text>
            </Pressable>
            <Pressable
              onPress={onNext}
              accessibilityRole="button"
              accessibilityLabel="Next card"
              style={({ pressed }) => [styles.inspectControlBtn, pressed ? styles.pressed : undefined]}
            >
              <Text style={styles.inspectControlText}>Next</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: "#0c0c10",
  },
  topBar: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 12,
    gap: 12,
  },
  topBarTitles: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  topBarCancel: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  topBarCancelText: {
    color: colors.parchmentMuted,
    fontSize: 15,
    fontWeight: "700",
  },
  brandTitle: {
    color: colors.parchment,
    fontSize: 20,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.4,
  },
  brandTagline: {
    color: "rgba(255,248,255,0.55)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionStack: {
    gap: 18,
  },
  glassCard: {
    backgroundColor: "rgba(21, 23, 37, 0.86)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 18,
  },
  idleTitle: {
    color: colors.parchment,
    fontSize: 22,
    fontWeight: "800",
    fontStyle: "italic",
    letterSpacing: 0.4,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
    marginBottom: 10,
  },
  idleProviderPill: {
    alignSelf: "flex-start",
    marginTop: -4,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: colors.parchmentMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  idleInputHint: {
    color: colors.parchmentMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: -4,
    marginBottom: 8,
    opacity: 0.85,
  },
  idleQuestInput: {
    marginTop: 0,
    marginBottom: 12,
  },
  idleSectionLabel: {
    color: colors.brass,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginTop: 6,
  },
  idleStartersLabel: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  starterHeadRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  starterMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 18,
  },
  pipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  pipFilled: {
    backgroundColor: colors.brass,
    borderColor: colors.brass,
  },
  starterClearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  starterClearText: {
    color: colors.parchment,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: -1,
  },
  topicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  topicCard: {
    minWidth: 140,
    minHeight: 108,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(67, 58, 122, 0.92)",
    backgroundColor: "rgba(10, 12, 22, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  topicCardSelected: {
    borderColor: colors.brass,
    backgroundColor: "rgba(255, 216, 77, 0.12)",
  },
  topicCardHovered: {
    borderColor: "rgba(121, 91, 255, 0.85)",
    backgroundColor: "rgba(32, 26, 66, 0.92)",
  },
  topicCardDisabled: {
    opacity: 0.45,
  },
  topicCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
  topicEmoji: {
    fontSize: 40,
    lineHeight: 48,
    textAlign: "center",
  },
  topicCardLabel: {
    color: colors.parchment,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  topicCheckBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brass,
    alignItems: "center",
    justifyContent: "center",
  },
  topicCheckMark: {
    color: "#120f28",
    fontSize: 13,
    fontWeight: "900",
    marginTop: -1,
  },
  generationErrorBox: {
    marginTop: 10,
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 122, 102, 0.45)",
    backgroundColor: "rgba(255, 122, 102, 0.1)",
    gap: 8,
  },
  generationErrorTitle: {
    color: colors.evil,
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  generationErrorBody: {
    color: colors.parchment,
    fontSize: 13,
    lineHeight: 19,
  },
  generationErrorDismiss: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  generationErrorDismissText: {
    color: colors.parchment,
    fontSize: 13,
    fontWeight: "700",
  },
  questInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: "rgba(13, 17, 29, 0.85)",
    color: colors.parchment,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  questInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  questInputFlex: {
    flex: 1,
    width: undefined,
  },
  questInputClear: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  questInputClearText: {
    color: colors.parchmentMuted,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: "800",
  },
  topicLine: {
    color: colors.parchmentMuted,
    fontSize: 15,
    textAlign: "center",
  },
  progressHead: {
    gap: 10,
    paddingHorizontal: 4,
  },
  progressEyebrow: {
    color: colors.lawful,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    textAlign: "center",
  },
  progressTrack: {
    height: 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.09)",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.lawful,
    borderRadius: 999,
  },
  selectedCard: {
    gap: 6,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedLabel: {
    color: colors.brass,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  selectedText: {
    flex: 1,
    color: colors.parchment,
    fontSize: 14,
    lineHeight: 20,
  },
  boardWrap: {
    alignItems: "center",
  },
  boardFrame: {
    alignSelf: "center",
    maxWidth: 760,
    gap: 12,
  },
  columnHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  boardHeaderCells: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  boardBodyRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  boardGridRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  axisLabelColumn: {
    color: "#7180a2",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  axisLabelRow: {
    color: "#7180a2",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "right",
    paddingRight: 2,
  },
  boardCell: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 3,
  },
  boardCellEmpty: {
    borderColor: "rgba(255,255,255,0.22)",
    borderStyle: "solid",
    backgroundColor: "rgba(255, 255, 255, 0.055)",
  },
  boardCellFilled: {
    borderColor: "rgba(83, 167, 255, 0.36)",
    backgroundColor: "rgba(18, 22, 40, 0.96)",
  },
  boardCellCorrect: {
    borderColor: colors.good,
  },
  boardCellMiss: {
    borderColor: colors.evil,
  },
  boardCellEmptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  boardCellPlus: {
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 52,
    opacity: 1,
    textShadowColor: "rgba(255,255,255,0.38)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  boardCardFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 8,
  },
  boardCardName: {
    color: colors.parchment,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    textAlign: "center",
  },
  boardCardRole: {
    color: colors.parchmentMuted,
    fontSize: 9,
    textAlign: "center",
  },
  boardCardReveal: {
    color: colors.brass,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  questActions: {
    gap: 10,
  },
  deckSection: {
    gap: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(13, 17, 29, 0.55)",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  deckFanOuter: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 0,
    paddingBottom: 0,
    overflow: "visible",
  },
  deckFanScroller: {
    overflow: "visible",
  },
  deckFanScrollContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
  },
  deckFanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  resultTitle: {
    color: colors.lawful,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resultPoints: {
    color: colors.parchment,
    fontSize: 40,
    fontWeight: "900",
    marginTop: 6,
  },
  resultSub: {
    color: colors.parchmentMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  resultsSubhead: {
    color: colors.parchment,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  answerKeyCaption: {
    color: colors.parchmentMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  answerKeyList: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 368,
    gap: 7,
    marginBottom: 4,
  },
  answerKeyRow: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(18, 22, 40, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
  },
  answerKeySlotStripe: {
    width: 5,
    alignSelf: "stretch",
  },
  answerKeyRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
    paddingHorizontal: 11,
    paddingLeft: 10,
    minHeight: 52,
  },
  answerKeyPortraitPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  answerKeyPortraitPlaceholderText: {
    color: colors.parchmentMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  answerKeyTexts: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  answerKeyName: {
    color: colors.parchment,
    fontSize: 13,
    fontWeight: "800",
  },
  answerKeyRole: {
    color: colors.parchmentMuted,
    fontSize: 11,
  },
  answerKeyAlignment: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginTop: 3,
  },
  answerKeyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    flexShrink: 0,
  },
  answerKeyBadgeHit: {
    backgroundColor: "rgba(98, 229, 140, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(98, 229, 140, 0.42)",
  },
  answerKeyBadgeMiss: {
    backgroundColor: "rgba(255, 122, 102, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 122, 102, 0.38)",
  },
  answerKeyBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  primaryButtonPressable: {
    width: "100%",
    alignSelf: "stretch",
  },
  primaryButtonBody: {
    height: 60,
    borderRadius: 16,
    backgroundColor: "#ff3a3f",
    borderWidth: 2,
    borderColor: "#ffb3b7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    overflow: "hidden",
  },
  primaryButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonHighlight: {
    position: "absolute",
    left: 6,
    right: 6,
    top: 6,
    height: 22,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  primaryButtonBevel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 10,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  primaryButtonBodyPressed: {
    backgroundColor: "#e82d32",
  },
  primaryButtonBodyDisabled: {
    backgroundColor: "#6a2a2d",
    borderColor: "rgba(255,255,255,0.2)",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: colors.parchment,
    fontSize: 15,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  inspectBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  inspectWebBlurFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 12, 22, 0.78)",
  },
  inspectSheet: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(18, 22, 40, 0.9)",
    padding: 16,
    gap: 14,
  },
  inspectTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  inspectTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  inspectName: {
    color: colors.parchment,
    fontSize: 18,
    fontWeight: "900",
  },
  inspectRole: {
    color: colors.parchmentMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  inspectClose: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  inspectCloseText: {
    color: colors.parchment,
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "800",
    marginTop: -2,
  },
  inspectPortraitWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  inspectPortraitFrame: {
    borderRadius: 999,
    padding: 10,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  inspectHintCard: {
    gap: 8,
  },
  inspectHintHeadline: {
    color: colors.brassBright,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  inspectHintBody: {
    color: colors.parchment,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  inspectHintBodyMuted: {
    color: colors.parchmentMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  inspectTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  inspectTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  inspectTagText: {
    color: colors.parchmentMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  inspectControls: {
    flexDirection: "row",
    gap: 10,
  },
  inspectControlBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  inspectControlText: {
    color: colors.parchment,
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  emptyQuestCard: {
    alignItems: "center",
    gap: 10,
  },
  emptyQuestTitle: {
    color: colors.parchment,
    fontSize: 22,
    fontWeight: "900",
  },
  emptyQuestBody: {
    color: colors.parchmentMuted,
    fontSize: 14,
    textAlign: "center",
  },
  emptyQuestSub: {
    color: colors.parchmentMuted,
    fontSize: 12,
    textAlign: "center",
    opacity: 0.9,
  },
  conjureLoaderRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  conjureLoaderDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  conjureLoaderDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: colors.verdigris,
  },
  conjureLoaderLabel: {
    flex: 1,
    color: colors.parchmentMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  conjureDeckTitle: {
    color: colors.parchment,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  conjureCarousel: {
    maxHeight: 140,
    width: "100%",
    marginTop: 4,
  },
  conjureCarouselContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 10,
    alignItems: "flex-start",
  },
  conjurePreviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 8,
    paddingBottom: 10,
  },
  conjurePreviewName: {
    color: colors.parchment,
    fontSize: 12,
    fontWeight: "700",
    minHeight: 32,
  },
  conjurePreviewArt: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    minHeight: CONJURE_PREVIEW_SIGIL + 12,
    overflow: "hidden",
  },
  shadowFigureWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    opacity: 0.85,
  },
  shadowFigureHead: {
    backgroundColor: "rgba(10,14,26,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  shadowFigureBody: {
    backgroundColor: "rgba(10,14,26,0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  shadowFigureGlow: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.12)",
    opacity: 0.15,
    transform: [{ scaleX: 1.1 }, { scaleY: 0.85 }],
  },
});

export default App;
