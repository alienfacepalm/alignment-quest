import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlignmentLogo } from "./src/components/AlignmentLogo";
import { SigilPortrait } from "./src/components/SigilPortrait";
import { defaultPrompt, generateBoard, getAlignmentLabel, suggestedTopics } from "./src/game/demoBoards";
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

const generationSteps = ["Resolving cast", "Judging alignments", "Preparing cards"];
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

  const [prompt, setPrompt] = useState(defaultPrompt);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [generationStep, setGenerationStep] = useState(0);
  const [board, setBoard] = useState<QuestBoard | null>(null);
  const [placements, setPlacements] = useState<Placements>(() => createEmptyPlacements());
  const [submittedPlacements, setSubmittedPlacements] = useState<Placements | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [score, setScore] = useState<QuestScore | null>(null);

  useEffect(() => {
    if (phase !== "generating") {
      return;
    }

    const stepInterval = setInterval(() => {
      setGenerationStep((current) => (current + 1) % generationSteps.length);
    }, 420);

    const timeout = setTimeout(() => {
      const nextBoard = generateBoard(prompt.trim() || defaultPrompt);
      setBoard(nextBoard);
      setPlacements(createEmptyPlacements());
      setSubmittedPlacements(null);
      setSelectedPersonId(null);
      setScore(null);
      setPhase("sorting");
    }, 1050);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(timeout);
    };
  }, [phase, prompt]);

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

  const startQuest = () => {
    setGenerationStep(0);
    setPhase("generating");
  };

  const backToStart = () => {
    setBoard(null);
    setPlacements(createEmptyPlacements());
    setSubmittedPlacements(null);
    setSelectedPersonId(null);
    setScore(null);
    setPhase("idle");
  };

  const handleSelectPerson = (personId: string) => {
    setSelectedPersonId((current) => (current === personId ? null : personId));
  };

  const handlePlaceSelected = (targetAlignment: AlignmentKey) => {
    if (!selectedPersonId || phase !== "sorting") {
      return;
    }

    setPlacements((current) => {
      const next = { ...current };
      const originCell = Object.entries(current).find(([, personId]) => personId === selectedPersonId)?.[0] as
        | AlignmentKey
        | undefined;
      const targetOccupant = current[targetAlignment];

      if (originCell) {
        next[originCell] = targetOccupant ?? null;
      }

      next[targetAlignment] = selectedPersonId;
      return next;
    });
  };

  const handleClearCell = (targetAlignment: AlignmentKey) => {
    if (phase !== "sorting") {
      return;
    }

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
              3×3 sort · nine cards
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {phase === "idle" ? (
          <View style={styles.sectionStack}>
            <GlassCard>
              <Text style={styles.idleTitle}>Pick a topic</Text>
              <Text style={styles.idleBody}>
                Choose a suggestion or type your own—e.g.{" "}
                <Text style={styles.idleInline}>action stars</Text>,{" "}
                <Text style={styles.idleInline}>Marvel characters</Text>, or your last{" "}
                <Text style={styles.idleInline}>D&D campaign</Text>. We build a 9-card deck; you place each figure
                where you think they belong.
              </Text>

              <Text style={styles.chipSectionLabel}>Suggested</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
                keyboardShouldPersistTaps="handled"
              >
                {suggestedTopics.map((topic) => {
                  const active = prompt.trim().toLowerCase() === topic.prompt.trim().toLowerCase();
                  return (
                    <Pressable
                      key={topic.label}
                      onPress={() => {
                        setPrompt(topic.prompt);
                        setGenerationStep(0);
                        setPhase("generating");
                      }}
                      style={({ pressed }) => [
                        styles.topicChip,
                        active ? styles.topicChipActive : undefined,
                        pressed ? styles.pressed : undefined,
                      ]}
                    >
                      <Text style={[styles.topicChipText, active ? styles.topicChipTextActive : undefined]}>
                        {topic.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={[styles.chipSectionLabel, styles.chipSectionSpaced]}>Or type your own</Text>
              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                placeholder="action stars, Marvel, my party, Star Wars…"
                placeholderTextColor={colors.parchmentMuted}
                style={styles.questInput}
                autoCapitalize="sentences"
                autoCorrect={false}
              />
              <PrimaryButton label="Start quest" onPress={startQuest} />
            </GlassCard>
          </View>
        ) : null}

        {phase === "generating" ? (
          <View style={styles.sectionStack}>
            <GlassCard style={styles.emptyQuestCard}>
              <Text style={styles.emptyQuestTitle}>Generating</Text>
              <Text style={styles.emptyQuestBody}>
                {generationSteps[generationStep] ?? generationSteps[0]!}
              </Text>
              <ProgressBar value={0.5} />
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
                          <Pressable
                            key={alignment}
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
                  <Text style={styles.deckHint}>Tap a name or a fanned card, then tap a cell on the board.</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.deckNameStrip}
                  contentContainerStyle={styles.deckNameStripContent}
                  keyboardShouldPersistTaps="handled"
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
                  <View style={styles.deckFanRow}>
                    {sortingDeckPeople.map((person, i) => {
                      const n = sortingDeckPeople.length;
                      const active = selectedPersonId === person.id;
                      const mid = (n - 1) / 2;
                      const t = n <= 1 ? 0 : (i / (n - 1)) * 2 - 1;
                      const tilt = t * deckFanMetrics.maxTilt;
                      const lift = n <= 1 ? 0 : Math.abs(i - mid) * 2.2;
                      return (
                        <Pressable
                          key={person.id}
                          onPress={() => handleSelectPerson(person.id)}
                          style={({ pressed }) => [
                            styles.deckCardFan,
                            shadow.card,
                            {
                              width: deckFanMetrics.cardW,
                              marginLeft: i === 0 ? 0 : -deckFanMetrics.overlap,
                              zIndex: active ? 200 : i,
                              minHeight: deckFanMetrics.cardBodyMinH,
                              borderColor: active ? person.accent : colors.panelBorder,
                            },
                            active ? styles.deckCardFanActive : undefined,
                            {
                              transform: active
                                ? [
                                    { translateY: -18 - lift },
                                    { rotate: `${tilt}deg` },
                                    { scale: 1.05 },
                                  ]
                                : [{ translateY: -lift }, { rotate: `${tilt}deg` }],
                            },
                            pressed ? styles.pressed : undefined,
                          ]}
                        >
                          <Text style={styles.deckCardFanName} numberOfLines={2}>
                            {person.name}
                          </Text>
                          <Text style={styles.deckCardFanRole} numberOfLines={1}>
                            {person.role}
                          </Text>
                          <View
                            style={[
                              styles.deckCardFanArt,
                              { backgroundColor: `${person.accent}22`, minHeight: deckFanMetrics.sigilSize + 16 },
                            ]}
                          >
                            <SigilPortrait
                              personId={person.id}
                              accent={person.accent}
                              size={deckFanMetrics.sigilSize}
                              accessibilityLabel={person.name}
                            />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
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
            <GlassCard accentColor={colors.lawful}>
              <Text style={styles.resultTitle}>Score</Text>
              <Text style={styles.resultPoints}>
                {score.points} / 9
              </Text>
              <Text style={styles.resultSub}>One point for each person on the right alignment.</Text>
            </GlassCard>

            <Text style={styles.resultsSubhead}>Answer key</Text>
            <View style={styles.reconstructionGrid}>
              {alignmentOrder.map((alignment) => {
                const personId = board.answerKey[alignment];
                const detail = score.details.find((d) => d.alignment === alignment);
                const exact = detail?.correct ?? false;
                const person = personId ? board.palette.find((p) => p.id === personId) : null;

                return (
                  <GlassCard
                    key={alignment}
                    style={styles.reconstructionCard}
                    accentColor={exact ? colors.good : colors.evil}
                  >
                    <Text style={styles.reconstructionStatus}>{exact ? "OK" : "miss"}</Text>
                    {person ? (
                      <SigilPortrait
                        personId={person.id}
                        accent={person.accent}
                        size={44}
                        accessibilityLabel={person.name}
                      />
                    ) : (
                      <Text style={styles.reconstructionEmoji}>—</Text>
                    )}
                    <Text style={styles.reconstructionLabel}>{getAlignmentLabel(alignment)}</Text>
                  </GlassCard>
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
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  idleBody: {
    color: colors.parchmentMuted,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  idleInline: {
    color: colors.parchment,
    fontWeight: "700",
  },
  chipSectionLabel: {
    color: colors.parchmentMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  chipSectionSpaced: {
    marginTop: 6,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
    paddingRight: 8,
  },
  topicChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: "rgba(13, 17, 29, 0.6)",
  },
  topicChipActive: {
    borderColor: colors.lawful,
    backgroundColor: "rgba(83, 167, 255, 0.12)",
  },
  topicChipText: {
    color: colors.parchment,
    fontSize: 13,
    fontWeight: "700",
  },
  topicChipTextActive: {
    color: colors.lawful,
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
    marginBottom: 14,
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
  deckCardFan: {
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(13, 17, 29, 0.96)",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 4,
  },
  deckCardFanActive: {
    backgroundColor: "rgba(28, 36, 62, 0.98)",
  },
  deckCardFanName: {
    color: colors.parchment,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  deckCardFanRole: {
    color: colors.parchmentMuted,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  deckCardFanArt: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
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
  reconstructionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  reconstructionCard: {
    width: "31.5%",
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 10,
  },
  reconstructionStatus: {
    color: colors.parchmentMuted,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  reconstructionEmoji: {
    color: colors.lawful,
    fontSize: 18,
    fontWeight: "900",
  },
  reconstructionLabel: {
    color: colors.parchment,
    fontSize: 10,
    textTransform: "uppercase",
    textAlign: "center",
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
});

export default App;
