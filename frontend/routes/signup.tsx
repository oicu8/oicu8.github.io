import * as React from "react";
import { I18n } from "react-i18next";
import { LifeChain } from "../lib/lifechain";
import hashHistory from "../lib/history";
import { checkNetworkId } from "../lib/utility";
import { Link } from "react-router-dom";

import ProfileSettingsCard from "../components/profile-settings-card";

interface Props {
  networkId: number;
  lifechain: LifeChain;
}
interface State {}
export default class Signup extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  componentDidMount() {
    checkNetworkId(this.props.lifechain, this.props.networkId);
    this.checkUsernameExists();
  }

  async checkUsernameExists() {
    const username = await this.props.lifechain.getUsernameFromAddress(
      this.props.lifechain.accountAddress
    );
    if (username.length) {
      hashHistory.replace(`/${this.props.networkId}/`);
    }
  }

  render() {
    return (
      <I18n>
        {(t, { i18n }) => (
          <div className="signup-page">
            <h1>{t("routes/signup/title")}</h1>
            <p className="subtitle">
              {t("routes/signup/subtitle")} <br />
              {t("routes/signup/topic-demo")}{" "}
              <Link
                to={`/${this.props.networkId}/topic/lifechain`}
                target="_blank"
              >
                #lifechain
              </Link>
            </p>
            <ProfileSettingsCard lifechain={this.props.lifechain} reset={true} />
          </div>
        )}
      </I18n>
    );
  }
}
