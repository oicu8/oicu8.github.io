/**
 * /:networkId/topic/:topic
 */
import * as React from "react";
import { I18n } from "react-i18next";
import { LifeChain, UserInfo } from "../lib/lifechain";
import {
  FeedInfo,
  generateSummaryFromHTML,
  generateFeedInfoFromTransactionInfo
} from "../lib/feed";
import { checkNetworkId } from "../lib/utility";
import { renderMarkdown } from "../lib/markdown";
import FeedCard from "../components/feed-card";
import ProfileCard from "../components/profile-card";
import Header from "../components/header";
import TopicFeedCards from "../components/topic-feed-cards";
import { TransactionInfo } from "../lib/transaction";

interface Props {
  lifechain: LifeChain;
  networkId: number;
  topic: string;
}
interface State {
  cover: string;
  following: boolean;
  mouseOver: boolean;
}

export default class profile extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      cover: null,
      following: true,
      mouseOver: false
    };
  }

  componentDidMount() {
    checkNetworkId(this.props.lifechain, this.props.networkId);
    this.initializeTopic(this.props.topic);
  }

  componentWillReceiveProps(newProps: Props) {
    // if (newProps.topic !== this.props.topic) {
    checkNetworkId(newProps.lifechain, newProps.networkId);
    this.initializeTopic(newProps.topic);
    // }
  }

  async initializeTopic(topic: string) {
    // check following or not
    const followingTopics = this.props.lifechain.settings.followingTopics;
    const following = !!followingTopics.filter(x => x.topic === topic).length;
    this.setState({
      following
    });

    // update cover
    const lifechain = this.props.lifechain;
    const formattedTag = lifechain.formatTag(topic);
    const blockNumber = parseInt(
      await lifechain.contractInstance.methods
        .getCurrentTagInfoByTrend(formattedTag)
        .call()
    );
    if (blockNumber) {
      const transactionInfo = await lifechain.getTransactionInfo({
        tag: formattedTag,
        maxCreation: Date.now(),
        blockNumber
      });
      if (transactionInfo) {
        const authorAddress = transactionInfo.from;
        const userInfo = await lifechain.getUserInfoFromAddress(authorAddress);
        if (userInfo) {
          this.setState({
            cover: userInfo.cover
          });
        }
      }
    }
  }

  followTopic = () => {
    this.props.lifechain
      .followTopic(this.props.topic)
      .then(() => {
        this.setState({
          following: true
        });
      })
      .catch(error => {
        new window["Noty"]({
          type: "error",
          text: error,
          timeout: 10000
        }).show();
      });
  };

  unfollowTopic = () => {
    this.props.lifechain
      .unfollowTopic(this.props.topic)
      .then(() => {
        this.setState({
          following: false
        });
      })
      .catch(error => {
        new window["Noty"]({
          type: "error",
          text: error,
          timeout: 10000
        }).show();
      });
  };

  render() {
    /**
     * Prevent from loading user address as topic.
     */
    if (this.props.lifechain.web3.utils.isAddress(this.props.topic)) {
      return (
        <I18n>
          {(t, { i18n }) => (
            <div className="topic-page">
              <p id="feed-footer">
                {t("general/invalid-topic")} {this.props.topic}
              </p>
            </div>
          )}
        </I18n>
      );
    }
    return (
      <I18n>
        {(t, { i18n }) => (
          <div className="topic-page">
            <Header lifechain={this.props.lifechain} />
            <div className="container">
              <div className="topic-card card">
                <div
                  className="cover"
                  style={{
                    backgroundImage: this.state.cover
                      ? `url("${this.state.cover}")`
                      : null
                  }}
                />
                <p className="title">#{this.props.topic}</p>
                {this.state.following ? (
                  this.state.mouseOver ? (
                    <div
                      className="follow-btn"
                      onMouseEnter={() => this.setState({ mouseOver: true })}
                      onMouseLeave={() => this.setState({ mouseOver: false })}
                      onClick={this.unfollowTopic}
                    >
                      {t("general/unfollow")}
                    </div>
                  ) : (
                    <div
                      className="follow-btn"
                      onMouseEnter={() => this.setState({ mouseOver: true })}
                      onMouseLeave={() => this.setState({ mouseOver: false })}
                    >
                      {t("general/following")}
                    </div>
                  )
                ) : (
                  <div className="follow-btn" onClick={this.followTopic}>
                    {t("general/follow")}
                  </div>
                )}
              </div>
              <TopicFeedCards
                lifechain={this.props.lifechain}
                topic={this.props.topic}
              />
            </div>
          </div>
        )}
      </I18n>
    );
  }
}
