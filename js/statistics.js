// js/statistics.js
// ============================================================
// Statistiques marrantes et records
// ============================================================

import {
  state, onStateReady, recomputeAllEloFull,
  computePlayerStats, getDisplayName, formatDateShort
} from "./app.js";

let allSorted = [];

onStateReady(() => {
  const { sorted } = recomputeAllEloFull();
  allSorted = sorted;
  renderAllStatistics();
});

// ─── Helper pour obtenir les stats d'un joueur ─────────────
function getPlayerStats(playerId) {
  return computePlayerStats(playerId, allSorted);
}

// ─── SECTION 1: ATTAQUE/DÉFENSE ───────────────────────────
function renderAttackDefense() {
  const players = Object.values(state.players);
  if (players.length === 0) return;

  // Meilleur buteur (wins en attaque)
  let bestAttacker = null, maxAttackWins = -1;
  let bestDefender = null, maxDefenseMatches = -1;
  let bestBalancer = null, minRatioDiff = Infinity;
  let bestSpecialist = null, maxAttackPct = -1;

  for (const p of players) {
    const stats = getPlayerStats(p.id);
    if (!stats || stats.totalMatches === 0) continue;

    // Meilleur buteur: wins en attaque
    let attackWins = 0;
    for (const match of allSorted) {
      const inA = match.teamA.some(p2 => p2.playerId === p.id);
      const inB = match.teamB.some(p2 => p2.playerId === p.id);
      if (!inA && !inB) continue;

      const playerSlot = (inA ? match.teamA : match.teamB).find(p2 => p2.playerId === p.id);
      if (playerSlot?.role === "attaque") {
        const won = (inA && match.scoreA > match.scoreB) || (inB && match.scoreB > match.scoreA);
        if (won) attackWins++;
      }
    }

    if (attackWins > maxAttackWins) {
      maxAttackWins = attackWins;
      bestAttacker = { id: p.id, name: getDisplayName(p.id), wins: attackWins };
    }

    // Meilleur défenseur: matchs en défense
    if (stats.matchesDef > maxDefenseMatches) {
      maxDefenseMatches = stats.matchesDef;
      bestDefender = { id: p.id, name: getDisplayName(p.id), matches: stats.matchesDef };
    }

    // Meilleur équilibriste: ratio att/def le plus proche de 1
    const ratio = stats.matchesAtt > 0 && stats.matchesDef > 0
      ? Math.abs(stats.matchesAtt - stats.matchesDef)
      : Infinity;
    if (stats.matchesAtt > 0 && stats.matchesDef > 0 && ratio < minRatioDiff) {
      minRatioDiff = ratio;
      bestBalancer = {
        id: p.id,
        name: getDisplayName(p.id),
        att: stats.matchesAtt,
        def: stats.matchesDef
      };
    }

    // Spécialiste attaque: % d'attaque le plus élevé
    if (stats.matchesAtt > 0 || stats.matchesDef > 0) {
      const total = stats.matchesAtt + stats.matchesDef;
      const pct = Math.round((stats.matchesAtt / total) * 100);
      if (pct > maxAttackPct) {
        maxAttackPct = pct;
        bestSpecialist = {
          id: p.id,
          name: getDisplayName(p.id),
          pct: pct
        };
      }
    }
  }

  // Remplir les éléments du DOM
  if (bestAttacker) {
    document.getElementById("bestAttackerInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[bestAttacker.id]?.color}">${bestAttacker.name}</div>
      <div class="stat-detail">${bestAttacker.wins} buts marqués en attaque</div>
    `;
  }

  if (bestDefender) {
    document.getElementById("bestDefenderInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[bestDefender.id]?.color}">${bestDefender.name}</div>
      <div class="stat-detail">${bestDefender.matches} matchs défendus</div>
    `;
  }

  if (bestBalancer) {
    document.getElementById("attackDefenseRatioInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[bestBalancer.id]?.color}">${bestBalancer.name}</div>
      <div class="stat-detail">${bestBalancer.att}A / ${bestBalancer.def}D</div>
    `;
  }

  if (bestSpecialist) {
    document.getElementById("attackSpecialistInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[bestSpecialist.id]?.color}">${bestSpecialist.name}</div>
      <div class="stat-detail">${bestSpecialist.pct}% en attaque</div>
    `;
  }
}

// ─── SECTION 2: RECORDS PERSONNELS ───────────────────────
function renderPersonalRecords() {
  const players = Object.values(state.players);
  if (players.length === 0) return;

  let bestWinStreak = { id: null, name: "", wins: 0 };
  let bestWinRate = { id: null, name: "", pct: 0, matches: 0 };
  let mostConsistent = { id: null, name: "", matches: 0 };
  let newestPlayer = null;
  let maxCreatedAt = null;

  for (const p of players) {
    const stats = getPlayerStats(p.id);
    if (!stats || stats.totalMatches === 0) continue;

    // Meilleure série
    if (stats.bestserie > bestWinStreak.wins) {
      bestWinStreak = { id: p.id, name: getDisplayName(p.id), wins: stats.bestserie };
    }

    // Meilleur taux de victoire (min 5 matchs)
    if (stats.totalMatches >= 5) {
      const pct = parseFloat(stats.winPct);
      if (pct > bestWinRate.pct || (pct === bestWinRate.pct && stats.totalMatches > bestWinRate.matches)) {
        bestWinRate = { id: p.id, name: getDisplayName(p.id), pct, matches: stats.totalMatches };
      }
    }

    // Plus constant (le plus de matchs)
    if (stats.totalMatches > mostConsistent.matches) {
      mostConsistent = { id: p.id, name: getDisplayName(p.id), matches: stats.totalMatches };
    }

    // Nouveau venu (le plus récemment ajouté)
    const createdAt = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
    if (!maxCreatedAt || createdAt > maxCreatedAt) {
      maxCreatedAt = createdAt;
      newestPlayer = { id: p.id, name: getDisplayName(p.id), date: formatDateShort(createdAt) };
    }
  }

  // Remplir les éléments
  if (bestWinStreak.id) {
    document.getElementById("winStreakInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[bestWinStreak.id]?.color}">${bestWinStreak.name}</div>
      <div class="stat-detail">${bestWinStreak.wins} victoires consécutives 🔥</div>
    `;
  }

  if (bestWinRate.id) {
    document.getElementById("winRateInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[bestWinRate.id]?.color}">${bestWinRate.name}</div>
      <div class="stat-detail">${bestWinRate.pct}% de domination</div>
    `;
  }

  if (mostConsistent.id) {
    document.getElementById("mostConsistentInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[mostConsistent.id]?.color}">${mostConsistent.name}</div>
      <div class="stat-detail">${mostConsistent.matches} matchs sans pause</div>
    `;
  }

  if (newestPlayer) {
    document.getElementById("newestPlayerInfo").innerHTML = `
      <div class="stat-player-name" style="color:${state.players[newestPlayer.id]?.color}">${newestPlayer.name}</div>
      <div class="stat-detail">Arrivé le ${newestPlayer.date}</div>
    `;
  }
}

// ─── SECTION 3: MATCHUPS & RIVALITÉS ───────────────────────
function renderMatchups() {
  const players = Object.values(state.players);
  if (players.length < 2) return;

  let worstEnemy = { p1: null, p2: null, p1Losses: 0 };
  let mainRival = { p1: null, p2: null, totalMatches: 0 };
  let bestTeam2v2 = { p1: null, p2: null, wins: 0 };
  let worstTeam2v2 = { p1: null, p2: null, losses: 0 };

  // Analyser les rivalités 1v1 et 2v2
  for (const p of players) {
    const stats = getPlayerStats(p.id);
    if (!stats) continue;

    // Pire ennemi (le plus de défaites contre une personne)
    for (const opp of stats.oppList) {
      if (opp.losses > worstEnemy.p1Losses) {
        worstEnemy = {
          p1: p.id,
          p1Name: getDisplayName(p.id),
          p2: opp.id,
          p2Name: opp.name,
          p1Losses: opp.losses,
          p2Wins: opp.wins
        };
      }
    }

    // Rival principal (le plus de matchs contre une personne)
    for (const opp of stats.oppList) {
      const total = opp.wins + opp.losses + opp.draws;
      if (total > mainRival.totalMatches) {
        mainRival = {
          p1: p.id,
          p1Name: getDisplayName(p.id),
          p2: opp.id,
          p2Name: opp.name,
          totalMatches: total
        };
      }
    }

    // Meilleures paires 2v2 (via teammates record)
    for (const tm of stats.teammateList) {
      if (tm.wins > bestTeam2v2.wins) {
        bestTeam2v2 = {
          p1: p.id,
          p1Name: getDisplayName(p.id),
          p2: tm.id,
          p2Name: tm.name,
          wins: tm.wins
        };
      }

      if (tm.losses > worstTeam2v2.losses) {
        worstTeam2v2 = {
          p1: p.id,
          p1Name: getDisplayName(p.id),
          p2: tm.id,
          p2Name: tm.name,
          losses: tm.losses
        };
      }
    }
  }

  // Remplir les éléments
  if (worstEnemy.p1) {
    document.getElementById("worstEnemyInfo").innerHTML = `
      <div class="matchup-players">
        <span style="color:${state.players[worstEnemy.p1]?.color}">${worstEnemy.p1Name}</span>
        vs
        <span style="color:${state.players[worstEnemy.p2]?.color}">${worstEnemy.p2Name}</span>
      </div>
      <div class="matchup-score">${worstEnemy.p2Wins} victoires : ${worstEnemy.p1Losses} défaites</div>
    `;
  }

  if (mainRival.p1) {
    document.getElementById("rivalInfo").innerHTML = `
      <div class="matchup-players">
        <span style="color:${state.players[mainRival.p1]?.color}">${mainRival.p1Name}</span>
        vs
        <span style="color:${state.players[mainRival.p2]?.color}">${mainRival.p2Name}</span>
      </div>
      <div class="matchup-score">${mainRival.totalMatches} matchs au total ⚔️</div>
    `;
  }

  if (bestTeam2v2.p1) {
    document.getElementById("bestTeamInfo").innerHTML = `
      <div class="matchup-players">
        <span style="color:${state.players[bestTeam2v2.p1]?.color}">${bestTeam2v2.p1Name}</span>
        &
        <span style="color:${state.players[bestTeam2v2.p2]?.color}">${bestTeam2v2.p2Name}</span>
      </div>
      <div class="matchup-score">${bestTeam2v2.wins} victoires ensemble</div>
    `;
  }

  if (worstTeam2v2.p1) {
    document.getElementById("worstTeamInfo").innerHTML = `
      <div class="matchup-players">
        <span style="color:${state.players[worstTeam2v2.p1]?.color}">${worstTeam2v2.p1Name}</span>
        &
        <span style="color:${state.players[worstTeam2v2.p2]?.color}">${worstTeam2v2.p2Name}</span>
      </div>
      <div class="matchup-score">${worstTeam2v2.losses} défaites ensemble 😅</div>
    `;
  }
}

// ─── SECTION 4: BADGES AMUSANTS ───────────────────────────
function renderBadges() {
  const players = Object.values(state.players);
  const badges = [];

  const badges_config = [
    {
      name: "🔥 Le Destructeur",
      desc: "Meilleure série de victoires",
      award: () => {
        let best = null, bestWins = 0;
        for (const p of players) {
          const stats = getPlayerStats(p.id);
          if (stats && stats.bestserie > bestWins) {
            bestWins = stats.bestserie;
            best = p;
          }
        }
        return best ? { player: best, value: bestWins } : null;
      }
    },
    {
      name: "💪 L'Invincible",
      desc: "Meilleur taux de victoire",
      award: () => {
        let best = null, bestPct = 0, bestMatches = 0;
        for (const p of players) {
          const stats = getPlayerStats(p.id);
          if (stats && stats.totalMatches >= 5) {
            const pct = parseFloat(stats.winPct);
            if (pct > bestPct || (pct === bestPct && stats.totalMatches > bestMatches)) {
              bestPct = pct;
              bestMatches = stats.totalMatches;
              best = p;
            }
          }
        }
        return best ? { player: best, value: bestPct } : null;
      }
    },
    {
      name: "⚽ Le Guerrier",
      desc: "Plus de matchs joués",
      award: () => {
        let best = null, maxMatches = 0;
        for (const p of players) {
          const stats = getPlayerStats(p.id);
          if (stats && stats.totalMatches > maxMatches) {
            maxMatches = stats.totalMatches;
            best = p;
          }
        }
        return best ? { player: best, value: maxMatches } : null;
      }
    },
    {
      name: "👑 Le Roi ELO",
      desc: "Meilleur classement ELO",
      award: () => {
        let best = null, maxElo = 0;
        for (const p of players) {
          if (p.elo > maxElo) {
            maxElo = p.elo;
            best = p;
          }
        }
        return best ? { player: best, value: Math.round(maxElo) } : null;
      }
    },
    {
      name: "🎯 Le Buteur Roi",
      desc: "Plus de buts en attaque",
      award: () => {
        let best = null, maxButs = 0;
        for (const p of players) {
          let butts = 0;
          for (const match of allSorted) {
            const inA = match.teamA.some(p2 => p2.playerId === p.id);
            const inB = match.teamB.some(p2 => p2.playerId === p.id);
            if (!inA && !inB) continue;

            const playerSlot = (inA ? match.teamA : match.teamB).find(p2 => p2.playerId === p.id);
            if (playerSlot?.role === "attaque") {
              const won = (inA && match.scoreA > match.scoreB) || (inB && match.scoreB > match.scoreA);
              if (won) butts++;
            }
          }
          if (butts > maxButs) {
            maxButs = butts;
            best = p;
          }
        }
        return best ? { player: best, value: maxButs } : null;
      }
    },
    {
      name: "🛡️ Le Bastion",
      desc: "Plus de matchs en défense",
      award: () => {
        let best = null, maxDef = 0;
        for (const p of players) {
          const stats = getPlayerStats(p.id);
          if (stats && stats.matchesDef > maxDef) {
            maxDef = stats.matchesDef;
            best = p;
          }
        }
        return best ? { player: best, value: maxDef } : null;
      }
    }
  ];

  badges_config.forEach(badge => {
    const result = badge.award();
    if (result) {
      badges.push({
        ...badge,
        playerId: result.player.id,
        playerName: getDisplayName(result.player.id),
        value: result.value
      });
    }
  });

  const container = document.getElementById("badgesContainer");
  container.innerHTML = badges.map(b => `
    <div class="badge-card">
      <div class="badge-icon">${b.name.split(' ')[0]}</div>
      <div class="badge-info">
        <div class="badge-title">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        <div class="badge-holder" style="color:${state.players[b.playerId]?.color}">
          ${b.playerName} - ${b.value}
        </div>
      </div>
    </div>
  `).join("");
}

// ─── SECTION 5: FAITS DIVERS ───────────────────────────────
function renderFacts() {
  const facts = [];
  const players = Object.values(state.players);

  if (players.length === 0) {
    document.getElementById("factsContainer").innerHTML = '<div class="empty-state">Aucune donnée disponible</div>';
    return;
  }

  // Fait 1: Nombre total de matchs
  const totalMatches = allSorted.length;
  if (totalMatches > 0) {
    facts.push({
      icon: "📊",
      text: `${totalMatches} matchs ont été joués sur ce terrain`
    });
  }

  // Fait 2: Joueur le plus chaud (meilleur ELO actuel)
  let hottest = null, maxElo = 0;
  for (const p of players) {
    if (p.elo > maxElo) {
      maxElo = p.elo;
      hottest = p;
    }
  }
  if (hottest) {
    facts.push({
      icon: "🔥",
      text: `${getDisplayName(hottest.id)} est en feu avec un ELO de ${Math.round(hottest.elo)} !`
    });
  }

  // Fait 3: Score le plus élevé
  let maxScore = 0, maxMatch = null;
  for (const match of allSorted) {
    const score = match.scoreA + match.scoreB;
    if (score > maxScore) {
      maxScore = score;
      maxMatch = match;
    }
  }
  if (maxMatch) {
    const playersA = maxMatch.teamA.map(p => getDisplayName(p.playerId)).join(" & ");
    const playersB = maxMatch.teamB.map(p => getDisplayName(p.playerId)).join(" & ");
    facts.push({
      icon: "💥",
      text: `Le match le plus fou: ${playersA} ${maxMatch.scoreA}-${maxMatch.scoreB} ${playersB} (${maxScore} buts!)`
    });
  }

  // Fait 4: Plus gros écart de score remporté
  let biggestVictory = { diff: 0, match: null };
  for (const match of allSorted) {
    const diff = Math.abs(match.scoreA - match.scoreB);
    if (diff > biggestVictory.diff && diff > 0) {
      biggestVictory = { diff, match };
    }
  }
  if (biggestVictory.match) {
    const winner = biggestVictory.match.scoreA > biggestVictory.match.scoreB
      ? biggestVictory.match.teamA.map(p => getDisplayName(p.playerId)).join(" & ")
      : biggestVictory.match.teamB.map(p => getDisplayName(p.playerId)).join(" & ");
    facts.push({
      icon: "🏆",
      text: `La victoire la plus écrasante: ${winner} gagne avec ${biggestVictory.diff} buts d'écart!`
    });
  }

  // Fait 5: Score le plus serré
  let closestMatches = [];
  for (const match of allSorted) {
    if (Math.abs(match.scoreA - match.scoreB) === 1) {
      closestMatches.push(match);
    }
  }
  if (closestMatches.length > 0) {
    const example = closestMatches[0];
    const playersA = example.teamA.map(p => getDisplayName(p.playerId)).join(" & ");
    const playersB = example.teamB.map(p => getDisplayName(p.playerId)).join(" & ");
    facts.push({
      icon: "😰",
      text: `${closestMatches.length} match${closestMatches.length > 1 ? 's' : ''} gagné${closestMatches.length > 1 ? 's' : ''} d'un but (ex: ${playersA} vs ${playersB})`
    });
  }

  // Fait 6: Ratio 1v1 / 2v2
  let matches1v1 = 0, matches2v2 = 0;
  for (const match of allSorted) {
    if (match.mode === "1v1") matches1v1++;
    else matches2v2++;
  }
  if (matches1v1 > 0 || matches2v2 > 0) {
    const pct1v1 = Math.round((matches1v1 / (matches1v1 + matches2v2)) * 100);
    const pct2v2 = 100 - pct1v1;
    facts.push({
      icon: "⚔️",
      text: `${pct1v1}% en 1v1 vs ${pct2v2}% en 2v2`
    });
  }

  // Fait 7: Joueur le plus discret
  let quietest = null, minMatches = Infinity;
  for (const p of players) {
    const stats = getPlayerStats(p.id);
    if (stats && stats.totalMatches < minMatches && stats.totalMatches > 0) {
      minMatches = stats.totalMatches;
      quietest = p;
    }
  }
  if (quietest && players.length > 1) {
    facts.push({
      icon: "🤐",
      text: `${getDisplayName(quietest.id)} est discret avec seulement ${minMatches} match(s)`
    });
  }

  // Fait 8: Série de défaites la plus longue
  let maxLossStreak = { player: null, streak: 0 };
  for (const player of players) {
    let currentLossStreak = 0;
    for (const match of allSorted) {
      const inA = match.teamA.some(p2 => p2.playerId === player.id);
      const inB = match.teamB.some(p2 => p2.playerId === player.id);
      if (!inA && !inB) continue;

      const lost = (inA && match.scoreA < match.scoreB) || (inB && match.scoreB < match.scoreA);
      if (lost) {
        currentLossStreak++;
      } else {
        if (currentLossStreak > maxLossStreak.streak) {
          maxLossStreak = { player, streak: currentLossStreak };
        }
        currentLossStreak = 0;
      }
    }
    if (currentLossStreak > maxLossStreak.streak) {
      maxLossStreak = { player, streak: currentLossStreak };
    }
  }
  if (maxLossStreak.streak > 2) {
    facts.push({
      icon: "😭",
      text: `Série noire record: ${getDisplayName(maxLossStreak.player.id)} avec ${maxLossStreak.streak} défaites d'affilée (ouch!)`
    });
  }

  // Fait 9: Joueur avec le plus d'évolution ELO
  let biggestEloSwing = { player: null, swing: 0, change: 0 };
  for (const p of players) {
    const stats = getPlayerStats(p.id);
    if (stats && stats.eloHistory.length > 1) {
      const start = stats.eloHistory[0].elo;
      const end = stats.eloHistory[stats.eloHistory.length - 1].elo;
      const swing = Math.abs(end - start);
      if (swing > biggestEloSwing.swing) {
        biggestEloSwing = { player: p, swing: swing.toFixed(0), change: (end - start).toFixed(0) };
      }
    }
  }
  if (biggestEloSwing.player) {
    const emoji = biggestEloSwing.change >= 0 ? "📈" : "📉";
    const direction = biggestEloSwing.change >= 0 ? "augmenté" : "diminué";
    facts.push({
      icon: emoji,
      text: `Évolution ELO: ${getDisplayName(biggestEloSwing.player.id)} a ${direction} de ${biggestEloSwing.swing} points!`
    });
  }

  // Fait 10: Meilleure paire 2v2
  let best2v2Team = { wins: 0, playerIds: [] };
  const teamRecords = {};
  for (const match of allSorted) {
    if (match.mode === "2v2") {
      for (const team of [match.teamA, match.teamB]) {
        const key = team.map(p => p.playerId).sort().join("_");
        if (!teamRecords[key]) teamRecords[key] = { wins: 0, total: 0, playerIds: team.map(p => p.playerId) };
        const isWinner = (team === match.teamA && match.scoreA > match.scoreB) ||
                         (team === match.teamB && match.scoreB > match.scoreA);
        if (isWinner) teamRecords[key].wins++;
        teamRecords[key].total++;
      }
    }
  }
  for (const [key, rec] of Object.entries(teamRecords)) {
    if (rec.wins > best2v2Team.wins) {
      best2v2Team = { wins: rec.wins, playerIds: rec.playerIds };
    }
  }
  if (best2v2Team.wins > 1) {
    const teamName = best2v2Team.playerIds.map(pid => getDisplayName(pid)).join(" & ");
    facts.push({
      icon: "🤝",
      text: `Une paire imbattable: ${teamName} avec ${best2v2Team.wins} victoires en 2v2!`
    });
  }

  // Fait 11: Plus de joueurs sans défaite (si applicable)
  let unbeaten = [];
  for (const p of players) {
    const stats = getPlayerStats(p.id);
    if (stats && stats.totalMatches > 0 && stats.losses === 0) {
      unbeaten.push({ id: p.id, name: getDisplayName(p.id), matches: stats.totalMatches });
    }
  }
  if (unbeaten.length > 0) {
    const topUnbeaten = unbeaten.sort((a, b) => b.matches - a.matches)[0];
    facts.push({
      icon: "⭐",
      text: `${topUnbeaten.name} est invaincu avec ${topUnbeaten.matches} match${topUnbeaten.matches > 1 ? 's' : ''}!`
    });
  }

  // Fait 12: Nombre de nulls (si applicable)
  let drawCount = 0;
  let drawExample = null;
  for (const match of allSorted) {
    if (match.scoreA === match.scoreB) {
      drawCount++;
      if (!drawExample) drawExample = match;
    }
  }
  if (drawCount > 0) {
    const playersA = drawExample.teamA.map(p => getDisplayName(p.playerId)).join(" & ");
    const playersB = drawExample.teamB.map(p => getDisplayName(p.playerId)).join(" & ");
    facts.push({
      icon: "🤝",
      text: `${drawCount} match${drawCount > 1 ? 's' : ''} ${drawCount > 1 ? 'se sont' : "s'est"} terminé${drawCount > 1 ? 's' : ''} en égalité (ex: ${playersA} vs ${playersB})`
    });
  }

  const container = document.getElementById("factsContainer");
  container.innerHTML = facts.map(f => `
    <div class="fact-card">
      <span class="fact-icon">${f.icon}</span>
      <span class="fact-text">${f.text}</span>
    </div>
  `).join("");
}

// ─── MAIN RENDER ────────────────────────────────────────────
function renderAllStatistics() {
  renderAttackDefense();
  renderPersonalRecords();
  renderMatchups();
  renderBadges();
  renderFacts();
}
