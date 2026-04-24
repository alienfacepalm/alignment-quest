import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getOpenAiApiKey } from "./src/config/openai";
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
  AlignmentKey,
  GamePhase,
  Placements,
  QuestBoard,
  QuestScore,
  alignmentOrder,
} from "./src/game/types";
import { colors, shadow } from "./src/theme";

const CONJURE_PREVIEW_CARD_W = 108;
const CONJURE_PREVIEW_SIGIL = 50;

const columnLabels = ["Lawful", "Neutral", "Chaotic"] as const;
const rowLabels = ["Good", "Neutral", "Evil"] as const;

const SCROLL_HORIZONTAL_PAD = 32;
const BOARD_BODY_GAP = 10;

/** 3×3 keys in row-major order (matches `rowLabels` / `columnLabels`). */
const ALIGNMENT_ROWS: AlignmentKey[][] = [
  ["lawful-good", "neutral-good", "chaotic-good"],
  ["lawful-neutral", "true-neutral", "chaotic-neutral"],
  ["lawful-evil", "neutral-evil", "chaotic-evil"],
];

function App() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 720;

  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [generatingSubPhase, setGeneratingSubPhase] = useState<"draft" | "portraits">("draft");
  const [generatingPreviewBoard, setGeneratingPreviewBoard] = useState<QuestBoard | null>(null);
  const [board, setBoard] = useState<QuestBoard | null>(null);
  const [placements, setPlacements] = useState<Placements>(() => createEmptyPlacements());
  const [submittedPlacements, setSubmittedPlacements] = useState<Placements | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [score, setScore] = useState<QuestScore | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const pendingPromptRef = useRef("");
  const cellMeasureRefs = useRef<Partial<Record<AlignmentKey, React.ElementRef<typeof View> | null>>>({});
  const cellRects = useRef<Partial<Record<AlignmentKey, { x: number; y: number; width: number; height: number }>>>({});
  const deckShake = useSharedValue(0);
  const scoreBurst = useSharedValue(1);
  const conjureCarouselRef = useRef<ScrollView>(null);

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

    let cancelled = false;
    const topic = pendingPromptRef.current;

    void (async () => {
      try {
        const nextBoard = await resolveQuestBoard(topic);
        if (cancelled) {
          return;
        }
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
        const withPortraits = await attachPortraitsToBoard(nextBoard, {
          onPersonUpdated: ({ board: b }) => {
            if (!cancelled) {
              setGeneratingPreviewBoard(b);
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

  /** Percent-based flex cells + fixed `gap` overflow on narrow widths; use measured 3×3 rows instead. */
  const boardLayout = useMemo(() => {
    const inner = Math.max(0, width - SCROLL_HORIZONTAL_PAD - insets.left - insets.right);
    const minRow = 38;
    const maxRow = 62;
    let cellGap = inner < 300 ? 5 : 8;
    let cellUpper = Math.floor((inner - BOARD_BODY_GAP - 2 * cellGap - minRow) / 3);
    let cellLower = Math.ceil((inner - BOARD_BODY_GAP - 2 * cellGap - maxRow) / 3);
    let cell = Math.min(cellUpper, Math.max(cellLower, 44));
    if (cellLower > cellUpper) {
      cellGap = 4;
      cellUpper = Math.floor((inner - BOARD_BODY_GAP - 2 * cellGap - minRow) / 3);
      cellLower = Math.ceil((inner - BOARD_BODY_GAP - 2 * cellGap - maxRow) / 3);
      cell = Math.min(cellUpper, Math.max(cellLower, 40));
    }
    const gridWidth = cell * 3 + cellGap * 2;
    const rowLabelWidth = Math.min(maxRow, Math.max(minRow, inner - BOARD_BODY_GAP - gridWidth));
    const sigilSize = Math.round(Math.min(isTablet ? 72 : 58, cell * 0.46));
    return { rowLabelWidth, cell, cellGap, gridWidth, sigilSize };
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
    return { inner, cardW, overlap, maxTilt, sigilSize, cardBodyMinH };
  }, [width, insets.left, insets.right, sortingDeckPeople.length]);

  const commitPlacement = useCallback(
    (personId: string, targetAlignment: AlignmentKey) => {
      if (phase !== "sorting") {
        return;
      }
      setSelectedPersonId(null);
      setPlacements((current) => {
        const next = { ...current };
        const originCell = Object.entries(current).find(([, id]) => id === personId)?.[0] as AlignmentKey | undefined;
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

  const hitTest = useCallback((px: number, py: number): AlignmentKey | null => {
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
    pendingPromptRef.current = prompt.trim();
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

  const handlePlaceSelected = (targetAlignment: AlignmentKey) => {
    if (!selectedPersonId || phase !== "sorting") {
      return;
    }
    const id = selectedPersonId;
    commitPlacement(id, targetAlignment);
    void playGameSfx("place");
    hapticLight();
  };

  const handleClearCell = (targetAlignment: AlignmentKey) => {
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
      <View pointerEvents="none" style={styles.backgroundGlowOne} />
      <View pointerEvents="none" style={styles.backgroundGlowTwo} />
      <View pointerEvents="none" style={styles.backgroundGlowThree} />

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

              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                placeholder="Thy quarry—knights of the Round Table, rogue stars, rival guilds…"
                placeholderTextColor={colors.parchmentMuted}
                style={[styles.questInput, styles.idleQuestInput]}
                autoCapitalize="sentences"
                autoCorrect={false}
              />
              <PrimaryButton label="Commence" onPress={beginQuestGeneration} />

              <Text style={[styles.idleSectionLabel, styles.idleStartersLabel]}>Starter realms</Text>
              <View style={styles.topicGrid}>
                {suggestedTopics.map((topic) => {
                  const selected =
                    prompt.trim().toLowerCase() === topic.prompt.trim().toLowerCase();
                  return (
                    <Pressable
                      key={topic.label}
                      accessibilityRole="button"
                      accessibilityLabel={`${topic.label}. ${topic.hook}`}
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setPrompt(topic.prompt);
                        setGenerationError(null);
                        void playGameSfx("tap");
                        hapticLight();
                      }}
                      style={({ pressed }) => [
                        styles.topicCard,
                        { flexBasis: isTablet ? "31%" : "47%" },
                        selected ? styles.topicCardSelected : undefined,
                        pressed ? styles.topicCardPressed : undefined,
                      ]}
                    >
                      <Text style={styles.topicEmoji}>{topic.emoji}</Text>
                      <Text style={styles.topicCardLabel}>{topic.label}</Text>
                      <Text style={styles.topicCardHook}>{topic.hook}</Text>
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
                        <SigilPortrait
                          personId={person.id}
                          accent={person.accent}
                          size={CONJURE_PREVIEW_SIGIL}
                          accessibilityLabel={person.name}
                          portraitUri={person.portraitUri}
                        />
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
            ) : null}

            <View style={styles.boardWrap}>
              <View style={styles.boardFrame}>
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
                                <View style={styles.boardCellEmptyState}>
                                  <Text style={styles.boardCellPlus}>+</Text>
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

            {phase === "sorting" ? (
              <View style={styles.deckSection}>
                <View style={styles.deckHeaderBlock}>
                  <Text style={styles.deckTitle}>Deck ({sortingDeckPeople.length})</Text>
                  <Text style={styles.deckHint}>
                    Tap a name or card to select, drag a fanned card onto the grid, or tap a cell after selecting.
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  style={styles.deckNameStrip}
                  contentContainerStyle={styles.deckNameStripContent}
                  keyboardShouldPersistTaps="always"
                >
                  {sortingDeckPeople.map((person) => {
                    const active = selectedPersonId === person.id;
                    return (
                      <Pressable
                        key={`chip-${person.id}`}
                        onPress={() => handleSelectPerson(person.id)}
                        style={({ pressed }) => [
                          styles.deckNameChip,
                          { borderColor: active ? person.accent : colors.panelBorder },
                          active ? { backgroundColor: `${person.accent}18` } : undefined,
                          pressed ? styles.pressed : undefined,
                        ]}
                      >
                        <Text style={styles.deckNameChipText} numberOfLines={2}>
                          {person.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={[styles.deckFanOuter, { minHeight: deckFanMetrics.cardBodyMinH + 56 }]}>
                  <Animated.View style={deckShakeStyle}>
                    <View style={styles.deckFanRow}>
                      {sortingDeckPeople.map((person, i) => {
                        const n = sortingDeckPeople.length;
                        const active = selectedPersonId === person.id;
                        const mid = (n - 1) / 2;
                        const t = n <= 1 ? 0 : (i / (n - 1)) * 2 - 1;
                        const tiltDeg = t * deckFanMetrics.maxTilt;
                        const liftPx = n <= 1 ? 0 : Math.abs(i - mid) * 2.2;
                        return (
                          <DeckFanCard
                            key={person.id}
                            person={person}
                            cardW={deckFanMetrics.cardW}
                            marginLeft={i === 0 ? 0 : -deckFanMetrics.overlap}
                            zIndex={active ? 200 : i}
                            minHeight={deckFanMetrics.cardBodyMinH}
                            sigilSize={deckFanMetrics.sigilSize}
                            tiltDeg={tiltDeg}
                            liftPx={liftPx}
                            active={active}
                            onTap={() => handleSelectPerson(person.id)}
                            onDragBegin={handleDeckDragBegin}
                            onDragEnd={handleDeckDragEnd(person.id)}
                          />
                        );
                      })}
                    </View>
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
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled ? styles.disabledButton : undefined,
        pressed && !disabled ? styles.pressed : undefined,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
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

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: "#0c0c10",
  },
  backgroundGlowOne: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(83, 167, 255, 0.16)",
  },
  backgroundGlowTwo: {
    position: "absolute",
    top: 220,
    left: -120,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(255, 102, 196, 0.12)",
  },
  backgroundGlowThree: {
    position: "absolute",
    bottom: 120,
    right: -90,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "rgba(255, 216, 77, 0.1)",
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
  idleQuestInput: {
    marginTop: 4,
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
  topicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  topicCard: {
    minWidth: 132,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    backgroundColor: "rgba(13, 17, 29, 0.72)",
    gap: 4,
  },
  topicCardSelected: {
    borderColor: colors.brass,
    backgroundColor: "rgba(255, 216, 77, 0.1)",
  },
  topicCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  topicEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  topicCardLabel: {
    color: colors.parchment,
    fontSize: 15,
    fontWeight: "800",
  },
  topicCardHook: {
    color: colors.parchmentMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
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
    width: "100%",
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
    borderWidth: 1,
  },
  boardCellEmpty: {
    borderColor: "rgba(255,255,255,0.12)",
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.03)",
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
  },
  boardCellPlus: {
    color: "#42557c",
    fontSize: 40,
    fontWeight: "700",
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
  deckHeaderBlock: {
    gap: 6,
  },
  deckTitle: {
    color: colors.parchment,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  deckHint: {
    color: colors.parchmentMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  deckNameStrip: {
    minHeight: 56,
    maxHeight: 92,
    flexGrow: 0,
  },
  deckNameStripContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
    paddingRight: 4,
  },
  deckNameChip: {
    maxWidth: 160,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "rgba(18, 22, 40, 0.92)",
  },
  deckNameChipText: {
    color: colors.parchment,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  deckFanOuter: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 8,
    paddingBottom: 10,
    overflow: "visible",
  },
  deckFanRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 8,
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
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#ff4046",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: colors.parchment,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  disabledButton: {
    opacity: 0.38,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
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
  },
});

export default App;
