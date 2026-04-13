import * as React from "react";

export class LetterOptions {
    enableAutoUpgrade: boolean = true;
    haveAutoUpgrade: boolean = false;
    defaultPurchaseAmount : number = 1;
    defaultPurchaseToMaxLimit : number = 1;
    minimumGrowth : number = 10;
    autoUpgradePriority : number = 5;
    autoUpgradeCondition : number = 0;
}

interface LetterOptionsProps{
    idx: number;
    options : LetterOptions;
    onOptionsChanged : (idx:number, newOptions: LetterOptions)=>void;
}

const amountArray = [1,10,20,50,100,200,500,1000,2000,5000];
const minGrowthArray = [0,10,20,50,100,200,500,1000,2000,5000];

export class LetterOptionsComponent extends React.Component<LetterOptionsProps, any> {
    onAutoUpgradeToggleChange(event: React.ChangeEvent<HTMLInputElement>)
    {
        let newOptions = {...this.props.options};
        newOptions.enableAutoUpgrade = event.target.checked;
        this.props.onOptionsChanged(this.props.idx, newOptions);
    }
    onPurchaseAmountChange(event: React.ChangeEvent<HTMLSelectElement>)
    {
        let newOptions = {...this.props.options};
        newOptions.defaultPurchaseAmount = parseInt(event.target.value);
        this.props.onOptionsChanged(this.props.idx, newOptions);
    }
    onMaxLimitChange(event: React.ChangeEvent<HTMLSelectElement>)
    {
        let newOptions = {...this.props.options};
        newOptions.defaultPurchaseToMaxLimit = parseInt(event.target.value);
        this.props.onOptionsChanged(this.props.idx, newOptions);
    }
    onMinGrowthChange(event: React.ChangeEvent<HTMLSelectElement>)
    {
        let newOptions = {...this.props.options};
        newOptions.minimumGrowth = parseInt(event.target.value);
        this.props.onOptionsChanged(this.props.idx, newOptions);
    }
    render() {
        return (
            <div className="settingsPanel">
                <table className="settingsTable">
                    <tbody>
                        {
                            this.props.options.haveAutoUpgrade &&
                            <tr>
                                <td className="settingsLabel">Enable auto purchase</td>
                                <td className="settingsValue">
                                    <input className="settingsCheckbox" type="checkbox" checked={this.props.options.enableAutoUpgrade} onChange={(e)=>this.onAutoUpgradeToggleChange(e)}/>
                                </td>
                            </tr>
                        }
                        <tr>
                            <td className="settingsLabel">Default purchase amount:</td>
                            <td className="settingsValue">
                                <select className="settingsSelect" value={this.props.options.defaultPurchaseAmount} onChange={(e)=>this.onPurchaseAmountChange(e)}>
                                    {amountArray.map((n)=><option key={n} value={n}>{n}</option>)}
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td className="settingsLabel">Default purchase max limit:</td>
                            <td className="settingsValue">
                                <select className="settingsSelect" value={this.props.options.defaultPurchaseToMaxLimit} onChange={(e)=>this.onMaxLimitChange(e)}>
                                    {amountArray.map((n)=><option key={n} value={n}>{n}</option>)}
                                </select>
                            </td>
                        </tr>
                        {
                            this.props.options.haveAutoUpgrade &&
                            <tr>
                                <td className="settingsLabel">Minimum growth:</td>
                                <td className="settingsValue">
                                    <select className="settingsSelect" value={this.props.options.minimumGrowth} onChange={(e)=>this.onMinGrowthChange(e)}>
                                        {minGrowthArray.map((n)=><option key={n} value={n}>{n}</option>)}
                                    </select>
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
        )
    }
}