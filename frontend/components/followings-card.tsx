import * as React from "react";
import { I18n } from "react-i18next";
import { Link } from "react-router-dom";

import { LifeChain, UserInfo } from "../lib/lifechain";

interface FollowingProps {
  username: string;
  lifechain: LifeChain;
  networkId: number;
}
interface FollowingState {
  userInfo: UserInfo;
}
class Following extends React.Component<FollowingProps, FollowingState> {
  constructor(props: FollowingProps) {
    super(props);
    this.state = {
      userInfo: null
    };
  }

  componentDidMount() {
    this.initializeFollowing(this.props.username);
  }

  componentWillReceiveProps(newProps: FollowingProps) {
    if (newProps.username !== this.props.username) {
      this.initializeFollowing(newProps.username);
    }
  }

  private async initializeFollowing(username: string) {
    const userInfo = await this.props.lifechain.getUserInfoFromUsername(username);
    this.setState({
      userInfo
    });
  }

  render() {
    const userInfo = this.state.userInfo;
    if (!userInfo) {
      return (
        <Link
          to={`/${this.props.networkId}/profile/${this.props.username}`}
          target="_blank"
        >
          <div className="following">
            <p className="msg">loading {this.props.username}</p>
          </div>
        </Link>
      );
    }
    return (
      <Link
        to={`/${this.props.networkId}/profile/${this.props.username}`}
        target="_blank"
      >
        <div className="following">
          <div
            className="avatar"
            style={{ backgroundImage: `url("${userInfo.avatar}")` }}
          />
          <div className="name-group">
            <p className="name">{userInfo.name}</p>
            <p className="username">{userInfo.username}</p>
          </div>
        </div>
      </Link>
    );
  }
}

interface Props {
  lifechain: LifeChain;
}
interface State {}
export default class FollowingsCard extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  render() {
    const lifechain = this.props.lifechain;
    return (
      <I18n>
        {(t, { i18n }) => (
          <div className="followings-card card">
            <p className="title">{t("components/followings-card/title")}</p>
            <div className="followings-list">
              {lifechain.settings.followingUsernames.map(
                (followingUsername, offset) => {
                  return (
                    <Following
                      username={followingUsername.username}
                      lifechain={lifechain}
                      networkId={lifechain.networkId}
                      key={offset}
                    />
                  );
                }
              )}
            </div>
          </div>
        )}
      </I18n>
    );
  }
}
