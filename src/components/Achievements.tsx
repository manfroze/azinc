import * as React from "react";
import { MiniButton } from './MiniButton';

export interface AchievementData {
    [key: string]: boolean;
}

export interface AchievementDef {
    id: string;
    name: string;
    desc: string;
    bonus: number;
}

export const achievementDefs: AchievementDef[] = [
    { id: 'first_click', name: 'First Click', desc: 'Click for the first time', bonus: 0.01 },
    { id: 'unlock_e', name: 'Halfway There (Almost)', desc: 'Unlock letter E', bonus: 0.02 },
    { id: 'unlock_m', name: 'Middle Ground', desc: 'Unlock letter M', bonus: 0.03 },
    { id: 'unlock_z', name: 'The Whole Alphabet', desc: 'Unlock letter Z', bonus: 0.05 },
    { id: 'count_1m_a', name: 'A Million As', desc: 'Reach 1,000,000 of letter A', bonus: 0.02 },
    { id: 'level_100', name: 'Century Converter', desc: 'Reach level 100 on any letter', bonus: 0.03 },
    { id: 'all_generating', name: 'Full Orchestra', desc: 'Have all unlocked letters generating', bonus: 0.05 },
    { id: 'click_100', name: 'Dedicated Clicker', desc: 'Click 100 times', bonus: 0.01 },
    { id: 'click_1000', name: 'Click Master', desc: 'Click 1,000 times', bonus: 0.02 },
    { id: 'prestige_1', name: 'Born Again', desc: 'Prestige for the first time', bonus: 0.05 },
    { id: 'synergy_active', name: 'Vowel Power', desc: 'Activate the vowel synergy', bonus: 0.03 },
    { id: 'challenge_1', name: 'Challenger', desc: 'Complete any challenge', bonus: 0.05 },
    { id: 'speed_5min', name: 'Speed Demon', desc: 'Unlock Z in under 5 minutes', bonus: 0.10 },
    { id: 'all_upgrades', name: 'Fully Upgraded', desc: 'Buy all ascension upgrades', bonus: 0.05 },
    { id: 'prestige_10', name: 'Veteran', desc: 'Prestige 10 times', bonus: 0.10 },
];

export function getAchievementBonus(achievements: AchievementData): number {
    let bonus = 0;
    for (const def of achievementDefs) {
        if (achievements[def.id]) {
            bonus += def.bonus;
        }
    }
    return 1 + bonus;
}

export function getUnlockedCount(achievements: AchievementData): number {
    let count = 0;
    for (const def of achievementDefs) {
        if (achievements[def.id]) count++;
    }
    return count;
}

interface AchievementsProps {
    achievements: AchievementData;
}

export class AchievementsComponent extends React.Component<AchievementsProps, undefined> {
    render() {
        let unlocked = getUnlockedCount(this.props.achievements);
        let total = achievementDefs.length;
        let bonusPct = ((getAchievementBonus(this.props.achievements) - 1) * 100).toFixed(0);

        return (
            <div>
                <div style={{ marginBottom: '10px', fontSize: '14px' }}>
                    {unlocked}/{total} unlocked | Total bonus: +{bonusPct}% generation
                </div>
                <table className="statsTable achievementsTable">
                    <tbody>
                        {achievementDefs.map((def) => {
                            let earned = this.props.achievements[def.id];
                            return (
                                <tr key={def.id} className={earned ? 'achievementEarned' : 'achievementLocked'}>
                                    <td className="achievementIcon">{earned ? '★' : '☆'}</td>
                                    <td className="statsLabel">
                                        <div>{def.name}</div>
                                        <div style={{ fontSize: '13px', color: '#999' }}>{def.desc}</div>
                                    </td>
                                    <td style={{ fontSize: '13px', color: earned ? '#4f4' : '#666' }}>
                                        +{(def.bonus * 100).toFixed(0)}%
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
