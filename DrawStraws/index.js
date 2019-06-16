const bugsnag = require('@bugsnag/js');
const { WebClient } = require('@slack/web-api');

module.exports = async function (context, req) {
  // set variables used in both main function and helper functions
  const {
    BUGSNAG_API_KEY,
    SLACK_BOT_OAUTH_ACCESS_TOKEN,
  } = process.env;
  const bugsnagClient = bugsnag(BUGSNAG_API_KEY);
  const slackWebClient = new WebClient(SLACK_BOT_OAUTH_ACCESS_TOKEN);
  const slackOptions = {
    slackAppLogoUrl: 'https://cdn.shopify.com/s/files/1/1329/2645/products/Drinking_Straws15_1024x1024.jpg?v=1498664680',
    fromUser: 'Straw Draw Slack App',
  };

  // helper functions
  async function handleError(error) {
    if (process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development') {
      // console.error(error.message);
      throw new Error(error);
    } else {
      /* eslint-disable no-undef */
      bugsnagClient.notify(error);
      /* eslint-enable no-endef */
    }
  }

  async function postToSlack(shortStrawUser, originalUserList) {
    const userNames = originalUserList.map(user => user.name);
    try {
      const messageConfig = {
        blocks: [
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `DRAWN FROM: ${userNames.join(' | ')}`,
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${shortStrawUser.user.profile.first_name} (\`@\`${shortStrawUser.user.name}) drew the short straw`,
            },
            accessory: {
              type: 'image',
              image_url: `${shortStrawUser.user.profile.image_48}`,
              alt_text: `${shortStrawUser.user.profile.real_name_normalized}`,
            }
          }
        ],
        as_user: false,
        icon_url: slackOptions.slackAppLogoUrl,
        username: slackOptions.fromUser,
      };
      const result = await slackWebClient.chat.postMessage(messageConfig);
      return result;
    } catch (error) {
      return handleError(error);
    }
  }

  async function listPrivateSlackChannels() {
    const result = await slackWebClient.groups.list();
    return result;
  }

  async function getPrivateSlackChannelInfo(slackChannel) {
    const result = await slackWebClient.groups.info({
        channel: slackChannel,
    });
    return result;
  }

  async function getPrivateSlackChannelMembers(slackChannel) {
    const result = await slackWebClient.groups.info({
        channel: slackChannel,
    });
    return result;
  }

  async function getSlackUserInfo(user) {
    const result = await slackWebClient.users.info({
        user,
    });
    return result;
  }

  async function getSlackUserNameFromId(user) {
    const result = await slackWebClient.users.info({
        user,
    });
    return result.user.name;
  }
  // end helper functions

  async function getRandomMember(membersArray) {
    const randomNum = Math.floor(Math.random() * (membersArray.length));
    return membersArray[randomNum].id;
  }

  async function parseUsersFromPostBody(postBody) {
    function objectify(array) {
      return array.reduce(function(p, c) {
           p[c[0]] = c[1];
           return p;
      }, {});
    }
    // takes the req body string and returns an array of arrays with the param names and values
    const pc = decodeURIComponent(postBody).split('&').map(param => param.split('='));
    // turns above array of arrays into an object
    const opc = objectify(pc);
    // console.log(opc);
    // turn string of users into an array
    const apc = opc.text.split('+');
    const slackUsersList = apc.map((user) => {
      return {
        id: user.replace('<@', '').replace('>', '').split('|')[0],
        name: user.replace('<@', '').replace('>', '').split('|')[1]
      };
    });
    return slackUsersList;
  }

  try {
    if (req.body.length) {
      const usersForStrawDraw = await parseUsersFromPostBody(req.body);
      if (userId) {
        console.log(userId);
        const userId = await getRandomMember(usersForStrawDraw);
        const shortStrawUserInfo = await getSlackUserInfo(userId);
        const msgInfo = await postToSlack(shortStrawUserInfo, usersForStrawDraw);
        context.done();
      } else {
        context.res = {
          // status: 200, /* Defaults to 200 */
          headers: {
            'Content-Type': 'text/html',
          },
          body: 'ERROR: You must pass usersnames in to the `/drawstraws` command',
        };
      }
    } else {
      context.res = {
        // status: 200, /* Defaults to 200 */
        headers: {
          'Content-Type': 'text/html',
        },
        body: 'ERROR: You must pass usersnames in to the `/drawstraws` command',
      };
    }
  } catch (error) {
    handleError(error);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
      body: 'Sorry, there was a problem with your request',
    };
  }
};
