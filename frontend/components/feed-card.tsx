import * as React from "react";
import { Component } from "react";
import { Link } from "react-router-dom";

import ImagesPanel from "./images-panel";
import UserTopPanel from "./user-top-panel";
import ActionsBottomPanel from "./actions-bottom-panel";

import { FeedInfo, generateFeedInfoFromTransactionInfo } from "../lib/feed";
import { LifeChain } from "../lib/lifechain";
import hashHistory from "../lib/history";

interface Props {
  feedInfo: FeedInfo;
  lifechain: LifeChain;
  hideActionsPanel?: boolean;
  hideParent?: boolean;
}
interface State {
  /**
   * The parent feed that you reply to.
   */
  parentFeedInfo: FeedInfo;
}

export default class FeedCard extends Component<Props, State> {
  private elem: HTMLDivElement;
  constructor(props: Props) {
    super(props);

    this.state = {
      parentFeedInfo: null
    };
  }

  componentDidMount() {
    this.addTargetBlankToAnchorElements();
    this.checkReply(this.props.feedInfo);
  }

  componentWillReceiveProps(newProps: Props) {
    if (this.props.feedInfo !== newProps.feedInfo) {
      this.checkReply(newProps.feedInfo);
    }
  }

  componentDidUpdate() {
    this.addTargetBlankToAnchorElements();
  }

  addTargetBlankToAnchorElements() {
    if (!this.elem) {
      return;
    }
    const anchorElements = this.elem.getElementsByTagName("A");
    for (let i = 0; i < anchorElements.length; i++) {
      const anchorElement = anchorElements[i] as HTMLAnchorElement;
      anchorElement.setAttribute("target", "_blank");
      anchorElement.onclick = event => {
        event.stopPropagation();
      };
    }
  }

  async checkReply(feedInfo: FeedInfo) {
    if (this.props.hideParent) {
      return;
    }
    if (feedInfo.feedType === "reply") {
      const parentTransactionInfo = await this.props.lifechain.getTransactionInfo({
        transactionHash:
          feedInfo.transactionInfo.decodedInputData.params[
            "parentTransactionHash"
          ].value
      });
      const parentFeedInfo = await generateFeedInfoFromTransactionInfo(
        this.props.lifechain,
        parentTransactionInfo
      );
      this.setState({
        parentFeedInfo
      });
    }
  }

  clickCard = event => {
    if (!this.props.feedInfo.transactionInfo.hash) {
      return;
    }
    /* window.open(
      `${window.location.pathname}#/${this.props.lifechain.networkId}/tx/${
        this.props.feedInfo.transactionInfo.hash
      }`,
    );
    */
    event.stopPropagation();
    event.preventDefault();
    console.log(
      "push: ",
      `/${this.props.lifechain.networkId}/tx/${
        this.props.feedInfo.transactionInfo.hash
      }`
    );
    hashHistory.push(
      `/${this.props.lifechain.networkId}/tx/${
        this.props.feedInfo.transactionInfo.hash
      }`
    );
  };

  render() {
    if (!this.props.feedInfo) {
      return null;
    }
    const summary = this.props.feedInfo.summary;
    const transactionInfo = this.props.feedInfo.transactionInfo;
    const userInfo = this.props.feedInfo.userInfo;
    const stateInfo = this.props.feedInfo.stateInfo;
    const repostUserInfo = this.props.feedInfo.repostUserInfo;
    const feedType = this.props.feedInfo.feedType;

    let parentFeedCard = null;
    if (this.state.parentFeedInfo) {
      parentFeedCard = (
        <div className="parent">
          <FeedCard
            feedInfo={this.state.parentFeedInfo}
            lifechain={this.props.lifechain}
            hideParent={true}
          />
        </div>
      );
    }

    if (summary.title) {
      // Article
      return (
        <div className="feed-card card" onClick={this.clickCard}>
          <UserTopPanel
            lifechain={this.props.lifechain}
            feedInfo={this.props.feedInfo}
          />
          <div className="content-panel">
            {summary.images.length ? (
              <div
                className="cover"
                style={{
                  backgroundImage: `url("${summary.images[0]}")`
                }}
              />
            ) : null}
            <div className="title">{summary.title}</div>
            <div
              ref={elem => (this.elem = elem)}
              className="summary"
              dangerouslySetInnerHTML={{ __html: summary.summary }}
            />
            {summary.hasMoreContent ? (
              <div className="continue-reading-div">
                <div className="continue-reading-btn">
                  &gt; continue reading...
                </div>
              </div>
            ) : null}
          </div>
          {parentFeedCard}
          {this.props.hideActionsPanel ? null : (
            <ActionsBottomPanel
              feedInfo={this.props.feedInfo}
              lifechain={this.props.lifechain}
            />
          )}
        </div>
      );
    } else {
      // Normal
      return (
        <div className="feed-card card" onClick={this.clickCard}>
          <UserTopPanel
            feedInfo={this.props.feedInfo}
            lifechain={this.props.lifechain}
          />
          <div className="content-panel">
            {summary.video ? (
              <div dangerouslySetInnerHTML={{ __html: summary.video }} />
            ) : (
              <ImagesPanel images={summary.images} />
            )}
            <div
              ref={elem => (this.elem = elem)}
              className="summary"
              dangerouslySetInnerHTML={{ __html: summary.summary }}
            />
            {summary.hasMoreContent ? (
              <div className="continue-reading-div">
                <div className="continue-reading-btn">
                  &gt; continue reading...
                </div>
              </div>
            ) : null}
          </div>
          {parentFeedCard}
          {this.props.hideActionsPanel ? null : (
            <ActionsBottomPanel
              feedInfo={this.props.feedInfo}
              lifechain={this.props.lifechain}
            />
          )}
        </div>
      );
    }
  }
}
