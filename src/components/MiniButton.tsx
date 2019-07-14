import * as React from "react";

interface MiniButtonProps {
    onClick: (e: React.MouseEvent<HTMLElement>) => void;
    borderless?: boolean;
    disabled?: boolean;
    normalColor?: string;
    disabledColor?: string;
    borderColor?: string;
    className?: string;
}

export class MiniButton extends React.Component<MiniButtonProps, undefined> {
    onClick(e: React.MouseEvent<HTMLElement>) {
        e.stopPropagation();
        if(!this.props.disabled) {
            this.props.onClick(e);
        }
    }
    render() {
        const dcolor = this.props.disabledColor ? this.props.disabledColor : 'gray';
        const ncolor = this.props.normalColor ? this.props.normalColor : '#333';
        let textColor = this.props.disabled ? dcolor : ncolor;
        let style: any = {
            color: textColor
        };

        let className = "miniButton";
        if (this.props.disabled) {
            className = "miniButtonDisabled";
        }
        if(this.props.className) {
            className += " " + this.props.className;
        }
        let buttonProps: any = {
            className: className,
            style: style
        }
        return <div {...buttonProps} onClick={(e) => this.onClick(e)}>{this.props.children}</div>
    }
}
