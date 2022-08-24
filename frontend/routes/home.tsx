import * as React from "react";
import MediaQuery from "react-responsive";
import { I18n } from "react-i18next";

import { LifeChain, UserInfo } from "../lib/lifechain";
import {
  FeedInfo,
  Summary,
  generateSummaryFromHTML,
  generateFeedInfoFromTransactionInfo
} from "../lib/feed";

import {
  decompressString,
  checkUserRegistration,
  checkNetworkId
} from "../lib/utility";
import { renderMarkdown } from "../lib/markdown";
import i18n from "../i18n/i18n";

import Footer from "../components/footer";
import Edit from "../components/edit";
import FeedCard from "../components/feed-card";
import ProfileCard from "../components/profile-card";
import AnnouncementCard from "../components/announcement-card";
import TopicsCard from "../components/topics-card";
import FollowingsCard from "../components/followings-card";
import Header, { Page } from "../components/header";
import Error from "../components/error";

interface HomeFeedsEntry {
  blockNumber: number;
  creation: number;
  userAddress: string;
}

interface Props {
  lifechain: LifeChain;
  networkId: number;
}
interface State {
  showEditPanel: boolean;
  msg: string;
  homeFeedsEntries: HomeFeedsEntry[]; // starting block numbers
  feeds: FeedInfo[];
  loading: boolean;
  doneLoadingAll: boolean;
  userInfo: UserInfo;
}
export default class Home extends React.Component<Props, State> {
  private lastFeedCard: HTMLDivElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      showEditPanel: false,
      msg: "",
      homeFeedsEntries: [],
      feeds: [],
      loading: false,
      doneLoadingAll: false,
      userInfo: null
    };
  }

  componentDidMount() {
    const lifechain = this.props.lifechain;
    document.body.scrollTop = 0;
    checkNetworkId(lifechain, this.props.networkId);
    checkUserRegistration(lifechain);
    this.updateUserInfo(lifechain);
    this.showUserHome(lifechain);
    this.bindWindowScrollEvent();
  }

  componentWillReceiveProps(newProps: Props) {
    // in order to get click in Header home tab to reload home page.
    // console.log('home will receive props')
    // if (this.props.lifechain !== newProps.lifechain) {
    document.body.scrollTop = 0;
    checkNetworkId(newProps.lifechain, newProps.networkId);
    checkUserRegistration(newProps.lifechain);
    this.updateUserInfo(newProps.lifechain);
    this.showUserHome(newProps.lifechain);
    this.bindWindowScrollEvent();
    // }
  }

  componentWillUnmount() {
    // TODO: Stop loading home feeds.
  }

  updateUserInfo(lifechain: LifeChain) {
    if (!lifechain) return;
    lifechain.getUserInfoFromAddress(lifechain.accountAddress).then(userInfo => {
      this.setState({
        userInfo
      });
    });
  }

  async showUserHome(lifechain: LifeChain) {
    if (!lifechain) return;
    // initialize homeFeedsEntries:
    const homeFeedsEntries: HomeFeedsEntry[] = [];
    const creation = Date.now();
    // TODO: change followingUsernames to followingUsers and store their addresses instead of usernames.
    for (let i = 0; i < lifechain.settings.followingUsernames.length; i++) {
      const username = lifechain.settings.followingUsernames[i].username;
      const userAddress = await lifechain.getAddressFromUsername(username);
      if (userAddress) {
        const blockNumber = parseInt(
          await lifechain.contractInstance.methods
            .getCurrentFeedInfo(userAddress)
            .call()
        );
        homeFeedsEntries.push({
          blockNumber,
          creation,
          userAddress
        });
      }
    }
    this.setState(
      {
        homeFeedsEntries,
        loading: false,
        doneLoadingAll: false,
        feeds: []
      },
      () => {
        this.showHomeFeeds();
      }
    );
  }

  showHomeFeeds() {
    const homeFeedsEntries = this.state.homeFeedsEntries;
    if (!homeFeedsEntries.length) {
      return this.setState({
        loading: false,
        doneLoadingAll: true
      });
    }
    if (this.state.loading) {
      // console.log(`it's loading...`)
      return;
    }
    this.setState(
      {
        loading: true
      },
      async () => {
        let maxBlockNumber = homeFeedsEntries[0].blockNumber;
        let maxCreation = homeFeedsEntries[0].creation;
        let maxUserAddress = homeFeedsEntries[0].userAddress;
        let maxOffset = 0;
        homeFeedsEntries.forEach((homeFeedsEntry, offset) => {
          if (
            homeFeedsEntry.blockNumber > maxBlockNumber ||
            (homeFeedsEntry.blockNumber === maxBlockNumber &&
              homeFeedsEntry.creation > maxCreation)
          ) {
            maxBlockNumber = homeFeedsEntry.blockNumber;
            maxCreation = homeFeedsEntry.creation;
            maxUserAddress = homeFeedsEntry.userAddress;
            maxOffset = offset;
          }
        });
        // console.log("showHomeFeeds", maxBlockNumber, maxCreation, maxUserAddress)
        const transactionInfo = await this.props.lifechain.getTransactionInfo(
          {
            userAddress: maxUserAddress,
            blockNumber: maxBlockNumber,
            maxCreation: maxCreation
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
          homeFeedsEntries.splice(maxOffset, 1); // finish loading all feeds from user.
          return this.setState(
            {
              loading: false
            },
            () => {
              this.scroll();
            }
          );
        } else {
          // TODO: reply
          const eventLog = transactionInfo.decodedLogs.filter(
            x => x.name === "SavePreviousFeedInfoEvent"
          )[0];
          let blockNumber;
          if (eventLog) {
            blockNumber = parseInt(eventLog.events["previousFeedInfoBN"].value);
          } else {
            blockNumber = transactionInfo.blockNumber;
          }
          const homeFeedsEntry = homeFeedsEntries[maxOffset];
          homeFeedsEntry.blockNumber = blockNumber;
          homeFeedsEntry.creation = transactionInfo.creation;

          const feedInfo = await generateFeedInfoFromTransactionInfo(
            this.props.lifechain,
            transactionInfo
          );
          const feeds = this.state.feeds;
          // TODO: remove duplicates.
          feeds.push(feedInfo);
          this.setState(
            {
              feeds,
              homeFeedsEntries
            },
            () => {
              this.setState(
                {
                  loading: false
                },
                () => {
                  // this.showHomeFeeds();
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
      const middlePanel = document.querySelector(
        ".middle-panel"
      ) as HTMLDivElement;

      if (
        middlePanel &&
        middlePanel.offsetHeight < scrollTop + 1.4 * offsetHeight
      ) {
        this.showHomeFeeds();
      }
    }
  };

  toggleEditPanel = () => {
    const { showEditPanel } = this.state;
    this.setState({ showEditPanel: !showEditPanel });
  };

  render() {
    if (this.props.lifechain && this.props.lifechain.accountAddress) {
      const lifechain = this.props.lifechain;
      const cards = (
        <I18n>
          {t => (
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
          )}
        </I18n>
      );
      const profileCard = (
        <ProfileCard
          userInfo={this.state.userInfo}
          lifechain={this.props.lifechain}
        />
      );
      const followingsCard = <FollowingsCard lifechain={this.props.lifechain} />;
      const topicsCard = <TopicsCard lifechain={this.props.lifechain} />;
      const postBtnGroup = (
        <div className="post-btn-group">
          <div className="lifechain-btn btn" onClick={this.toggleEditPanel}>
            <i className="fas fa-pen-square" />LifeChain
          </div>
          <a href="https://github.com/oicu8/lifechain" target="_blank">
            <div className="github-btn btn">
              <i className="fab fa-github" />
            </div>
          </a>
          <a href="https://github.com/oicu8/lifechain/issues" target="_blank">
            <div className="bug-btn github-btn btn">
              <i className="fas fa-bug" />
            </div>
          </a>
          <a href="https://ethgasstation.info/" target="_blank">
            <div className="github-btn btn">
              <i className="fas fa-fire" />
            </div>
          </a>
        </div>
      );

      return (
        <div className="home">
          <Header lifechain={this.props.lifechain} page={Page.HomePage} />
          <div className="container">
            <MediaQuery query="(max-width: 1368px)">
              <div className="left-panel">
                {profileCard}
                {postBtnGroup}
                {followingsCard}
                {topicsCard}
              </div>
              <div className="middle-panel">{cards}</div>
            </MediaQuery>
            <MediaQuery query="(min-width: 1368px)">
              <div className="left-panel">
                {profileCard}
                {followingsCard}
              </div>
              <div className="middle-panel">{cards}</div>
              <div className="right-panel">
                {postBtnGroup}
                {topicsCard}
              </div>
            </MediaQuery>
            {this.state.showEditPanel ? (
              <Edit cancel={this.toggleEditPanel} lifechain={this.props.lifechain} />
            ) : null}
          </div>
        </div>
      );
    } else {
      return <Error />;
    }
  }
}
