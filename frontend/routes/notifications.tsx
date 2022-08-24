import * as React from "react";
import { I18n } from "react-i18next";

import Header, { Page } from "../components/header";
import FeedCard from "../components/feed-card";
import { LifeChain, UserInfo } from "../lib/lifechain";
import { checkUserRegistration, checkNetworkId } from "../lib/utility";
import {
  FeedInfo,
  Summary,
  generateSummaryFromHTML,
  generateFeedInfoFromTransactionInfo
} from "../lib/feed";
import { renderMarkdown } from "../lib/markdown";
import i18n from "../i18n/i18n";

interface CurrentFeed {
  creation: number;
  blockNumber: number;
}

interface Props {
  lifechain: LifeChain;
  networkId: number;
}
interface State {
  feeds: FeedInfo[];
  loading: boolean;
  doneLoadingAll: boolean;
  msg: string;
}

export default class Notifications extends React.Component<Props, State> {
  private currentFeed: CurrentFeed;
  constructor(props: Props) {
    super(props);
    this.state = {
      feeds: [],
      loading: false,
      doneLoadingAll: false,
      msg: ""
    };
  }

  componentDidMount() {
    const lifechain = this.props.lifechain;
    document.body.scrollTop = 0;
    checkNetworkId(lifechain, this.props.networkId);
    checkUserRegistration(lifechain);
    this.showUserNotifications(lifechain);
    this.bindWindowScrollEvent();
  }

  componentWillReceiveProps(newProps: Props) {
    const lifechain = this.props.lifechain;
    document.body.scrollTop = 0;
    checkNetworkId(newProps.lifechain, newProps.networkId);
    checkUserRegistration(lifechain);
    this.showUserNotifications(lifechain);
    this.bindWindowScrollEvent();
  }

  componentWillUnmount() {
    // TODO: Stop loading notifications
  }

  async showUserNotifications(lifechain: LifeChain) {
    const blockNumber = parseInt(
      await lifechain.contractInstance.methods
        .getCurrentTagInfoByTrend(lifechain.formatTag(lifechain.accountAddress))
        .call()
    );
    this.currentFeed = {
      blockNumber,
      creation: Date.now()
    };
    this.setState(
      {
        loading: false,
        doneLoadingAll: false,
        feeds: []
      },
      () => {
        this.showNotificationFeeds();
      }
    );
  }

  async showNotificationFeeds() {
    const lifechain = this.props.lifechain;
    if (!this.currentFeed || !this.currentFeed.blockNumber) {
      return this.setState({
        loading: false,
        doneLoadingAll: true
      });
    }
    if (this.state.loading) {
      return;
    }
    this.setState(
      {
        loading: true
      },
      async () => {
        const formattedTag = lifechain.formatTag(lifechain.accountAddress);
        const transactionInfo = await lifechain.getTransactionInfo(
          {
            tag: formattedTag,
            maxCreation: this.currentFeed.creation,
            blockNumber: this.currentFeed.blockNumber
          },
          (blockNumber, index, total) => {
            if (index >= 0) {
              this.setState({
                msg: i18n.t("notification/Syncing-block-from-blockchain", {
                  index: index + 1,
                  total,
                  blockNumber
                })
              });
            } else {
              this.setState({
                msg: i18n.t("notification/Syncing-block-from-database", {
                  blockNumber
                })
              });
            }
          }
        );
        if (!transactionInfo) {
          return this.setState({
            loading: false,
            doneLoadingAll: true
          });
        } else {
          const eventLog = transactionInfo.decodedLogs.filter(
            x =>
              x.name === "SavePreviousTagInfoEvent" &&
              x.events["tag"].value === formattedTag
          )[0];
          const blockNumber = parseInt(
            eventLog.events["previousTagInfoBN"].value
          );
          this.currentFeed = {
            blockNumber,
            creation:
              blockNumber === this.currentFeed.blockNumber
                ? transactionInfo.creation
                : Date.now()
          };

          const feedInfo = await generateFeedInfoFromTransactionInfo(
            lifechain,
            transactionInfo
          );
          const feeds = this.state.feeds;
          feeds.push(feedInfo);
          this.setState(
            {
              feeds
            },
            () => {
              this.setState(
                {
                  loading: false
                },
                () => {
                  this.scroll();
                }
              );
            }
          );
        }
      }
    );
  }

  bindWindowScrollEvent() {
    window.onscroll = this.scroll;
  }

  scroll = () => {
    if (this.state.doneLoadingAll) {
      return;
    } else {
      const scrollTop = document.body.scrollTop;
      const offsetHeight = document.body.offsetHeight;
      const container = document.querySelector(".container") as HTMLDivElement;

      if (
        container &&
        container.offsetHeight < scrollTop + 1.4 * offsetHeight
      ) {
        this.showNotificationFeeds();
      }
    }
  };

  render() {
    return (
      <I18n>
        {t => (
          <div className="notifications-page">
            <Header lifechain={this.props.lifechain} page={Page.NotificationsPage} />
            <div className="container">
              <div className="cards">
                {this.state.feeds.map((feedInfo, index) => (
                  <FeedCard
                    key={index}
                    feedInfo={feedInfo}
                    lifechain={this.props.lifechain}
                  />
                ))}
                <p id="feed-footer">
                  {" "}
                  {this.state.loading
                    ? this.state.msg
                    : t("general/No-more-feeds")}{" "}
                </p>
              </div>
            </div>
          </div>
        )}
      </I18n>
    );
  }
}
