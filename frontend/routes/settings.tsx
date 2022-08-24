import * as React from "react";

import Header, { Page } from "../components/header";
import ProfileSettingsCard from "../components/profile-settings-card";
import { LifeChain, UserInfo } from "../lib/lifechain";
import { checkUserRegistration, checkNetworkId } from "../lib/utility";

interface Props {
  lifechain: LifeChain;
  networkId: number;
}
interface State {}

export default class Settings extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  componentDidMount() {
    checkNetworkId(this.props.lifechain, this.props.networkId);
    checkUserRegistration(this.props.lifechain);
  }

  componentWillReceiveProps(newProps: Props) {
    checkNetworkId(newProps.lifechain, newProps.networkId);
    checkUserRegistration(newProps.lifechain);
  }

  render() {
    return (
      <div className="settings-page">
        <Header lifechain={this.props.lifechain} page={Page.SettingsPage} />
        <ProfileSettingsCard
          lifechain={this.props.lifechain}
          showDeleteAppCacheButton={true}
        />
      </div>
    );
  }
}
