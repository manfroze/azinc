import * as React from "react";
import { MiniButton } from './MiniButton';

export interface ChallengeDef {
    id: string;
    name: string;
    desc: string;
    restriction: string;
    rewardDesc: string;
    rewardMult: number;
}

export interface ChallengeState {
    completed: { [key: string]: boolean };
    active: string | null;
}

export function challengeById(id: string): ChallengeDef {
    for (var i = 0; i < challengeDefs.length; i++) {
        if (challengeDefs[i].id === id) return challengeDefs[i];
    }
    return challengeDefs[0];
}

export const challengeDefs: ChallengeDef[] = [
    {
        id: 'no_auto',
        name: 'Manual Labor',
        desc: 'Reach letter Z without using any auto-upgraders',
        restriction: 'Auto-upgrade is disabled for all letters',
        rewardDesc: '+20% generation permanently',
        rewardMult: 0.20
    },
    {
        id: 'no_mult',
        name: 'Base Rate',
        desc: 'Reach letter Z without any multiplier upgrades',
        restriction: 'All multiplier upgrades are disabled',
        rewardDesc: '+15% generation permanently',
        rewardMult: 0.15
    },
    {
        id: 'minimalist',
        name: 'Minimalist',
        desc: 'Reach letter Z with max 10 levels per letter',
        restriction: 'Cannot buy more than 10 autoconverters per letter',
        rewardDesc: '+25% generation permanently',
        rewardMult: 0.25
    },
    {
        id: 'half_alphabet',
        name: 'Sprint',
        desc: 'Reach letter M in under 2 minutes',
        restriction: 'Timer starts when challenge begins',
        rewardDesc: '+10% generation permanently',
        rewardMult: 0.10
    },
    {
        id: 'no_pause',
        name: 'Unstoppable',
        desc: 'Reach letter Z without pausing any letter',
        restriction: 'Pause button is disabled',
        rewardDesc: '+15% generation permanently',
        rewardMult: 0.15
    }
];

export function getChallengeBonus(challenges: ChallengeState): number {
    let bonus = 0;
    for (const def of challengeDefs) {
        if (challenges.completed[def.id]) {
            bonus += def.rewardMult;
        }
    }
    return 1 + bonus;
}

interface ChallengesProps {
    challenges: ChallengeState;
    onStartChallenge: (id: string) => void;
    onAbandonChallenge: () => void;
}

export class ChallengesComponent extends React.Component<ChallengesProps, undefined> {
    render() {
        let bonusPct = ((getChallengeBonus(this.props.challenges) - 1) * 100).toFixed(0);
        let active = this.props.challenges.active;

        return (
            <div>
                <div style={{ marginBottom: '10px', fontSize: '14px' }}>
                    Total challenge bonus: +{bonusPct}% generation
                </div>
                {active && (
                    <div className="challengeActive">
                        <span>Active: {challengeById(active).name}</span>
                        <MiniButton borderColor="#f54242" onClick={() => this.props.onAbandonChallenge()}>
                            <span className="smallText">Abandon</span>
                        </MiniButton>
                    </div>
                )}
                <table className="statsTable">
                    <tbody>
                        {challengeDefs.map((def) => {
                            let completed = this.props.challenges.completed[def.id];
                            let isActive = active === def.id;
                            return (
                                <tr key={def.id} className={completed ? 'achievementEarned' : ''}>
                                    <td>
                                        {completed ? (
                                            <span className="ownedText" style={{ padding: '2px 6px' }}>Done</span>
                                        ) : isActive ? (
                                            <span style={{ color: '#f5cb42' }}>Active</span>
                                        ) : active ? (
                                            <span style={{ color: '#666' }}>---</span>
                                        ) : (
                                            <MiniButton borderColor="gray" onClick={() => this.props.onStartChallenge(def.id)}>
                                                <span className="smallText">Start</span>
                                            </MiniButton>
                                        )}
                                    </td>
                                    <td className="upgradeDescTd">
                                        <div>{def.name}</div>
                                        <div style={{ fontSize: '13px', color: '#999' }}>{def.desc}</div>
                                        <div style={{ fontSize: '12px', color: '#4f4' }}>{def.rewardDesc}</div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }
}
