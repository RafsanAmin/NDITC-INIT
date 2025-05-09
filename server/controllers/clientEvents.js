const { ParEvents, Events, sequelize, Participants, CAs, PageSettings } = require('../models');
const { teams } = require('../models');
const { BadRequestError, UnauthenticatedError, UnauthorizedError } = require('../errors');
const mailer = require('../utils/sendMail');
const deleteFile = require('../utils/deleteFile');
const sendSMS = require('../utils/sendSMS');
const increaseCA = require('../utils/increaseCA');

require('express-async-errors');

const findEvent = async (mode, eventName) => {
  if (mode !== 'par')
    throw new UnauthenticatedError(
      'You do not have permission to select this event for participation. Please login to continue.'
    );
  if (!eventName) throw new BadRequestError('Event field should not be empty');
  const targetEvent = await Events.findOne({ where: { value: eventName } });
  if (!targetEvent) throw new UnauthenticatedError('Unauthenticated eventName entered');
  return targetEvent;
};

const sePaticipation = async (req, res) => {
  const { eventName, CtransactionId, fullName, CTransactionNum, roll_no } = req.body;
  const { mode, id } = req.user;
  const targetEvent = await findEvent(mode, eventName);

  if (targetEvent.team) throw new UnauthenticatedError(`Unauthenticated eventName entered`);

  let [[clientEmail], metaData] = await sequelize.query(
    `SELECT email FROM participants WHERE id=${id}`
  );

  const parEvents = await ParEvents.findOne({ where: { parId: id } });
  let { eventInfo, paidEvent, fee, transactionID, transactionNum } = parEvents;
  eventInfo = JSON.parse(eventInfo);
  paidEvent = JSON.parse(paidEvent);
  fee = JSON.parse(fee);
  transactionID = JSON.parse(transactionID);
  transactionNum = JSON.parse(transactionNum);

  // check if already selected
  if (eventInfo.hasOwnProperty(`${eventName}`))
    throw new UnauthenticatedError('Already selected this event for participation');

  eventInfo[`${eventName}`] = 0;
  let updatedData = { eventInfo: JSON.stringify(eventInfo) };

  if (targetEvent.paid) {
    if (!CtransactionId || !CTransactionNum)
      throw new BadRequestError('Transaction informations must be provided for paid events');
    paidEvent[`${eventName}`] = 0;
    fee[`${eventName}`] = targetEvent.fee;
    transactionID[`${eventName}`] = CtransactionId;
    transactionNum[`${eventName}`] = CTransactionNum;
    updatedData = {
      eventInfo: JSON.stringify(eventInfo),
      paidEvent: JSON.stringify(paidEvent),
      fee: JSON.stringify(fee),
      transactionID: JSON.stringify(transactionID),
      transactionNum: JSON.stringify(transactionNum),
      roll_no: roll_no,
    };
  }
  await ParEvents.update(updatedData, { where: { parId: id } });
  // mailer(
  //   {
  //     client: {
  //       fullName: fullName,
  //       email: clientEmail.email,
  //     },
  //     info: {
  //       eventName: targetEvent.name,
  //       paid: targetEvent.paid,
  //     },
  //   },
  //   'eventVerified'
  // ).catch((err) => {
  //   // // cmnt
  // });

  res.json({ succeed: true, msg: `successfully registered for ${eventName}` });
};

const sePaticipationAdmin = async (req, res) => {
  try {
    const { eventName, fullName, email } = req.body;

    const targetEvent = await findEvent('par', eventName);

    if (targetEvent.team) throw new UnauthenticatedError(`Unauthenticated eventName entered`);

    const parInfo = await Participants.findOne({ where: { email } });
    const parEvents = await ParEvents.findOne({ where: { parId: parInfo.id } });
    const settings = await PageSettings.findByPk(1);

    let { eventInfo, paidEvent, fee, transactionID, transactionNum } = parEvents;
    eventInfo = JSON.parse(eventInfo);
    paidEvent = JSON.parse(paidEvent);
    fee = JSON.parse(fee);
    transactionID = JSON.parse(transactionID);
    transactionNum = JSON.parse(transactionNum);

    console.log(eventInfo);

    // check if already selected
    if (eventInfo.hasOwnProperty(`${eventName}`)) {
      throw new UnauthenticatedError('Already selected this event for participation');
      return;
    }

    eventInfo[`${eventName}`] = 0;
    let updatedData = { eventInfo: JSON.stringify(eventInfo) };

    if (targetEvent.paid) {
      paidEvent[`${eventName}`] = 1;
      fee[`${eventName}`] = targetEvent.fee;
      transactionID[`${eventName}`] = 'Booth';
      transactionNum[`${eventName}`] = 'Booth';
      updatedData = {
        eventInfo: JSON.stringify(eventInfo),
        paidEvent: JSON.stringify(paidEvent),
        fee: JSON.stringify(fee),
        transactionID: JSON.stringify(transactionID),
        transactionNum: JSON.stringify(transactionNum),
      };
    }
    await ParEvents.update(updatedData, { where: { parId: parInfo.id } });
    // mailer(
    //   {
    //     client: {
    //       fullName: fullName,
    //       email: clientEmail.email,
    //     },
    //     info: {
    //       eventName: targetEvent.name,
    //       paid: targetEvent.paid,
    //     },
    //   },
    //   'eventVerified'
    // ).catch((err) => {
    //   // // cmnt
    // });
    if (parInfo.caRef) {
      await increaseCA(parInfo.caRef, 'paid');
    }
    let prevCount = JSON.parse(settings.eventCountBooth)[eventName];
    let updated = {
      ...JSON.parse(settings.eventCountBooth),
      [eventName]: !prevCount ? 1 : 1 + prevCount,
    };
    console.log(prevCount, updated);

    await PageSettings.update({ eventCountBooth: JSON.stringify(updated) }, { where: { id: 1 } });
  } catch (err) {
    console.log(err);
  }

  res.json({ succeed: true, msg: `successfully registered for ${eventName}` });
};

const teamParticipation = async (req, res) => {
  const { CteamName, members, eventName, CtransactionId, CTransactionNum, roll_no } = req.body;
  const { mode, id, userName } = req.user;
  const targetEvent = await findEvent(mode, eventName);

  //if not team event reject
  if (!targetEvent.team) throw new UnauthenticatedError(`${eventName} is not a team based event!!`);

  const isTeamThere = await teams.findOne({ where: { name: CteamName } });
  if (isTeamThere) {
    throw new UnauthenticatedError(
      `${CteamName} is already there. Please Select another name for your team.`
    );
  }

  let [[clientEmail]] = await sequelize.query(
    `SELECT email,fullName FROM participants WHERE id=${id}`
  );
  const parEvents = await ParEvents.findOne({ where: { parId: id } });
  let { eventInfo, teamName, paidEvent, fee, transactionID, transactionNum } = parEvents;

  eventInfo = JSON.parse(eventInfo);
  paidEvent = JSON.parse(paidEvent);
  fee = JSON.parse(fee);
  transactionID = JSON.parse(transactionID);
  transactionNum = JSON.parse(transactionNum);
  teamName = JSON.parse(teamName);

  //check if already selected the event
  if (eventInfo.hasOwnProperty(`${eventName}`)) {
    throw new UnauthenticatedError('Already selected this event for participation');
  }

  //setting eventInfo and teamNames
  eventInfo[`${eventName}`] = 0;
  teamName[`${eventName}`] = CteamName;

  let updatedData = {
    eventInfo: JSON.stringify(eventInfo),
    teamName: JSON.stringify(teamName),
  };

  if (targetEvent.paid) {
    if (!CtransactionId || !CTransactionNum)
      throw new BadRequestError('Transaction informations must be provided for paid events');
    paidEvent[`${eventName}`] = 0;
    fee[`${eventName}`] = targetEvent.fee;
    transactionID[`${eventName}`] = CtransactionId;
    transactionNum[`${eventName}`] = CTransactionNum;
    updatedData = {
      eventInfo: JSON.stringify(eventInfo),
      teamName: JSON.stringify(teamName),
      paidEvent: JSON.stringify(paidEvent),
      fee: JSON.stringify(fee),
      transactionID: JSON.stringify(transactionID),
      transactionNum: JSON.stringify(transactionNum),
      roll_no: roll_no,
    };
  }

  let membersIds = [];

  if (members) {
    if (members.length > 0) {
      [membersIds] = await sequelize.query(
        `SELECT email,fullName from participants WHERE email IN(${members.map(
          (member) => `'${member}'`
        )})`
      );

      if (membersIds.length !== members.length)
        throw new UnauthenticatedError(
          'Wrong email of any member entered. Please be assure that these emails were used to register'
        );

      //check if the max member exceeded
    }

    // cmnt

    if (members.length > targetEvent.maxMember) {
      throw new UnauthenticatedError(
        `Team members limit exceeded. Should not be more than ${targetEvent.maxMember}`
      );
    }

    members.forEach((member) => {
      if (member === clientEmail.email) {
        throw new BadRequestError(
          'you cannot give your email as a member or team mate, as you are already leading this team'
        );
      }
    });
  }

  const newTeam = await teams.create({
    name: CteamName,
    leader: userName,
    event: eventName,
    members: JSON.stringify(membersIds),
  });

  //updating the ParEvents data
  ParEvents.update(updatedData, { where: { parId: id } });

  //setting the members events
  // const setToPerMembers = async () => {
  //   membersIds.forEach(async (member) => {
  //     const targetParEvent = await ParEvents.findOne({
  //       where: { parId: member.id },
  //     });

  //     let { eventInfo, teamName } = targetParEvent;
  //     eventInfo = JSON.parse(eventInfo);
  //     teamName = JSON.parse(teamName);

  //     eventInfo[`${eventName}`] = 0;
  //     teamName[`${eventName}`] = CteamName;
  //     await ParEvents.update(
  //       {
  //         eventInfo: JSON.stringify(eventInfo),
  //         teamName: JSON.stringify(teamName),
  //       },
  //       { where: { parId: member.id } }
  //     );
  //   });
  // };
  // setToPerMembers()
  //sending the mail

  // mailer(
  //   {
  //     client: {
  //       fullName: clientEmail.fullName,
  //       email: clientEmail.email,
  //     },
  //     info: {
  //       eventName: targetEvent.name,
  //       members: members,
  //       teamName: CteamName,
  //       paid: targetEvent.paid,
  //     },
  //   },
  //   'teamEventVerify'
  // ).catch((err) => {
  //   // // cmnt
  // });

  res.json({
    succeed: true,
    result: newTeam,
    msg: `successfully registered for ${eventName}`,
  });
};

const teamParticipationAdmin = async (req, res) => {
  const { CteamName, members, eventName, email, boothFee } = req.body;

  const targetEvent = await findEvent('par', eventName);

  //if not team event reject
  if (!targetEvent.team) throw new UnauthenticatedError(`${eventName} is not a team based event!!`);

  const isTeamThere = await teams.findOne({ where: { name: CteamName } });
  if (isTeamThere) {
    throw new UnauthenticatedError(
      `${CteamName} is already there. Please Select another name for your team.`
    );
  }

  const parInfo = await Participants.findOne({ where: { email } });
  const settings = await PageSettings.findByPk(1);
  const parEvents = await ParEvents.findOne({ where: { parId: parInfo.id } });

  let { eventInfo, teamName, paidEvent, fee, transactionID, transactionNum } = parEvents;

  eventInfo = JSON.parse(eventInfo);
  paidEvent = JSON.parse(paidEvent);
  fee = JSON.parse(fee);
  transactionID = JSON.parse(transactionID);
  transactionNum = JSON.parse(transactionNum);
  teamName = JSON.parse(teamName);

  //check if already selected the event
  if (eventInfo.hasOwnProperty(`${eventName}`)) {
    throw new UnauthenticatedError('Already selected this event for participation');
  }

  //setting eventInfo and teamNames
  eventInfo[`${eventName}`] = 0;
  teamName[`${eventName}`] = CteamName;

  let updatedData = {
    eventInfo: JSON.stringify(eventInfo),
    teamName: JSON.stringify(teamName),
  };

  if (targetEvent.paid) {
    paidEvent[`${eventName}`] = 1;
    fee[`${eventName}`] = targetEvent.fee;
    transactionID[`${eventName}`] = 'Booth';
    transactionNum[`${eventName}`] = 'Booth';
    updatedData = {
      eventInfo: JSON.stringify(eventInfo),
      teamName: JSON.stringify(teamName),
      paidEvent: JSON.stringify(paidEvent),
      fee: JSON.stringify(fee),
      transactionID: JSON.stringify(transactionID),
      transactionNum: JSON.stringify(transactionNum),
    };
  }

  let membersIds = [];

  if (members) {
    if (members.length > targetEvent.maxMember) {
      throw new UnauthenticatedError(
        `Team members limit exceeded. Should not be more than ${targetEvent.maxMember}`
      );
    }

    members.forEach((member) => {
      membersIds.push({ fullName: member });
    });
  }

  const newTeam = await teams.create({
    name: CteamName,
    leader: parInfo.userName,
    event: eventName,
    members: JSON.stringify(membersIds),
  });

  //updating the ParEvents data
  ParEvents.update(updatedData, { where: { parId: parInfo.id } });
  // Participants.increment('boothFee', { by: boothFee, where: { id: parInfo.id } });
  if (parInfo.caRef) {
    await increaseCA(parInfo.caRef, 'paid');
  }
  //setting the members events
  // const setToPerMembers = async () => {
  //   membersIds.forEach(async (member) => {
  //     const targetParEvent = await ParEvents.findOne({
  //       where: { parId: member.id },
  //     });

  //     let { eventInfo, teamName } = targetParEvent;
  //     eventInfo = JSON.parse(eventInfo);
  //     teamName = JSON.parse(teamName);

  //     eventInfo[`${eventName}`] = 0;
  //     teamName[`${eventName}`] = CteamName;
  //     await ParEvents.update(
  //       {
  //         eventInfo: JSON.stringify(eventInfo),
  //         teamName: JSON.stringify(teamName),
  //       },
  //       { where: { parId: member.id } }
  //     );
  //   });
  // };
  // setToPerMembers()
  //sending the mail

  // mailer(
  //   {
  //     client: {
  //       fullName: clientEmail.fullName,
  //       email: clientEmail.email,
  //     },
  //     info: {
  //       eventName: targetEvent.name,
  //       members: members,
  //       teamName: CteamName,
  //       paid: targetEvent.paid,
  //     },
  //   },
  //   'teamEventVerify'
  // ).catch((err) => {
  //   // // cmnt
  // });
  let prevCount = JSON.parse(settings.eventCountBooth)[eventName];
  let updated = {
    ...JSON.parse(settings.eventCountBooth),
    [eventName]: !prevCount ? 1 : 1 + prevCount,
  };
  console.log(prevCount, updated);

  await PageSettings.update({ eventCountBooth: JSON.stringify(updated) }, { where: { id: 1 } });
  res.json({
    succeed: true,
    result: newTeam,
    msg: `successfully registered for ${eventName}`,
  });
};

const paidVerify = async (req, res) => {
  const parId = req.params.parId;
  const { type, eventName } = req.body;

  if (type === true || type === false) {
    const [metadata] = await sequelize.query(`UPDATE parevents
SET paidEvent=JSON_REPLACE(paidEvent,"$.${eventName}",${type ? 1 : 0})
WHERE parId='${parId}';`);

    if (metadata.changedRows === 0) {
      return res.json({
        succeed: false,
        msg: `did not match any record or Already updated to ${type ? 1 : 0} in the past`,
      });
    }
  } else {
    throw new BadRequestError('You entered an invalid type');
  }

  const [[parInfo]] = await sequelize.query(
    `SELECT fullName,email,phone,caRef FROM participants WHERE id=${parId}`
  );

  const mailing = async () => {
    mailer(
      {
        client: {
          fullName: parInfo.fullName,
          email: parInfo.email,
        },
        info: {
          eventName,
          type,
        },
      },
      'paymentVerify'
    ).catch((err) => {
      // // cmnt
    });
  };
  mailing();
  let stateMsg = '';
  //sending sms to client
  if (parInfo.caRef) {
    await increaseCA(parInfo.caRef, 'paid');
  }
  res.json({
    succeed: true,
    state: type,
    msg: stateMsg || `Successfully updated`,
  });
};

const findTeamInfo = async (req, res) => {
  const teamName = req.params.teamName;
  const teamInfo = await teams.findOne({ where: { name: teamName } });
  if (teamInfo) {
    res.json({
      succeed: true,
      result: teamInfo,
      msg: 'successfully found the team',
    });
  } else {
    res.json({ succeed: false, msg: 'this team does not exist' });
  }
};

const changeTransactionId = async (req, res) => {
  const { transactionObj, previousObj, fullName, email } = req.body;
  const { id, mode } = req.user;
  if (!transactionObj) throw new BadRequestError('you cannot provide any empty value');
  if (mode === 'ca') throw new BadRequestError('please login as a participant');
  const [metadata] = await ParEvents.update(
    { transactionID: JSON.stringify(transactionObj) },
    { where: { parId: id } }
  );

  mailer(
    {
      client: {
        fullName: fullName,
        email: email,
      },
      info: {
        transactionObj,
        previousObj,
      },
    },
    'TIDChange'
  ).catch((err) => {
    // // cmnt
  });

  if (metadata == 1) {
    res.json({ succeed: true, msg: 'successfully updated' });
  } else {
    res.json({
      succeed: false,
      msg: 'Update failed, something went wrong. Please try again maintaining the conditions',
    });
  }
};

const updateProfileInfos = async (req, res) => {
  const { fullName, phone, institute, className, address, fb, email } = req.body;
  const { mode, id } = req.user;
  if (!fullName || !phone || !institute || !className || !address || !fb || !email)
    throw new BadRequestError('you cannot provide any empty value');

  //check if email there
  let isEmailHolder;
  if (mode === 'par') {
    isEmailHolder = await Participants.findOne({
      attributes: ['id'],
      where: { email: email },
    });
  } else if (mode === 'ca') {
    isEmailHolder = await CAs.findOne({
      attributes: ['id'],
      where: { email: email },
    });
  }
  if (isEmailHolder) {
    if (isEmailHolder.id !== id)
      throw new UnauthorizedError(
        'Another account is using this email id. Please enter another one'
      );
  }

  const data = {
    fullName,
    phone,
    institute,
    className,
    address,
    fb,
  };
  let metadata;
  if (mode === 'par') {
    [metadata] = await Participants.update(data, { where: { id: id } });
  } else if (mode === 'ca') {
    [metadata] = await CAs.update(data, { where: { id: id } });
  }

  if (metadata == 1) res.json({ succeed: true, msg: 'successfully updated' });
  else {
    res.json({
      succeed: false,
      msg: 'Update failed, something went wrong. Please try again maintaining the conditions',
    });
  }
};

const editClientImage = async (req, res) => {
  const { mode, id } = req.user;
  const newImg = req.file.path;
  let previousClientImg;
  if (mode === 'par') {
    previousClientImg = await Participants.findByPk(id, {
      attributes: ['image'],
    });
  } else if (mode == 'ca') {
    previousClientImg = await CAs.findByPk(id, {
      attributes: ['image'],
    });
  }

  if (previousClientImg) {
    if (newImg !== previousClientImg.image) {
      deleteFile(previousClientImg.image);
    }
    let metadata;
    if (mode === 'par') {
      [metadata] = await Participants.update({ image: newImg }, { where: { id: id } });
    } else if (mode === 'ca') {
      [metadata] = await CAs.update({ image: newImg }, { where: { id: id } });
    }

    if (metadata == 1) {
      return res.json({
        succeed: true,
        msg: 'successfully updated image',
        result: newImg,
      });
    } else {
      deleteFile(newImg);
      return res.json({
        succeed: false,
        msg: 'Something went wrong. Please try again',
      });
    }
  } else {
    deleteFile(newImg);
    throw new BadRequestError('user id did not match');
  }
};

const submitFile = async (req, res) => {
  const file = req.file.path;
  const targetEvent = req.params.eventValue;
  const { id } = req.user;
  const { SubLinks, SubNames } = req.submissionObj;
  let updatedSubLink = '';
  if (!SubLinks.hasOwnProperty(targetEvent)) {
    updatedSubLink = { ...SubLinks, [targetEvent]: file };
  } else {
    updatedSubLink = {
      ...SubLinks,
      [targetEvent]: `${SubLinks[targetEvent]},${file}`,
    };
  }

  let updatedSubNames = '';
  if (!SubNames.hasOwnProperty(targetEvent)) {
    updatedSubNames = { ...SubNames, [targetEvent]: req.fileExt };
  } else {
    updatedSubNames = {
      ...SubNames,
      [targetEvent]: `${SubNames[targetEvent]},${req.fileExt}`,
    };
  }

  await ParEvents.update(
    {
      SubLinks: JSON.stringify(updatedSubLink),
      SubNames: JSON.stringify(updatedSubNames),
    },
    { where: { parId: id } }
  );
  res.json({
    succeed: true,
    msg: 'successfully submitted',
  });
};

const clearSubInfos = async (req, res) => {
  const targetEvent = req.params.eventValue;
  const { id } = req.user;
  const { SubLinks, SubNames } = req.submissionObj;
  const { mode } = req.body;

  //deleting files
  if (mode === 'file' && SubLinks[targetEvent]) {
    SubLinks[targetEvent].split(',').forEach((link) => {
      if (link) {
        deleteFile(link);
      }
    });
  }

  let updatedSubLink = { ...SubLinks, [targetEvent]: '' };
  let updatedSubNames = { ...SubNames, [targetEvent]: '' };

  await ParEvents.update(
    {
      SubLinks: JSON.stringify(updatedSubLink),
      SubNames: JSON.stringify(updatedSubNames),
    },
    { where: { parId: id } }
  );

  res.json({
    succeed: true,
    msg: 'successfully cleared',
  });
};

const clearEventInfo = async (req, res) => {
  const { parId, targetEvent } = req.body;

  const parEvInfo = await ParEvents.findOne({ where: { parId } });

  const removeArray = [
    'teamName',
    'paidEvent',
    'fee',
    'transactionID',
    'SubLinks',
    'SubNames',
    'transactionNum',
    'eventInfo',
  ];

  const changes = {};

  removeArray.forEach((vl) => {
    const v = JSON.parse(parEvInfo[vl]);
    if (v[targetEvent] !== undefined) {
      delete v[targetEvent];
    }
    console.log(v[targetEvent], vl);
    changes[vl] = JSON.stringify(v);
  });

  if (parEvInfo.teamName[targetEvent]) {
    await teams.destroy({
      where: { name: parEvInfo.teamName[targetEvent] },
    });
  }

  if (changes == {}) {
    res.json({
      succeed: false,
      msg: "Haven't participated in this event.",
    });
  } else {
    await ParEvents.update(changes, { where: { parId } });

    res.json({
      succeed: true,
      msg: 'successfully cleared',
    });
  }
};

const submitLink = async (req, res) => {
  const { links, names } = req.body;
  const targetEvent = req.params.eventValue;
  const { id } = req.user;
  const { SubLinks, SubNames } = req.submissionObj;

  if (!links || !names) throw new BadRequestError('fields should not be empty');

  const parEvents = await ParEvents.findOne({ where: { parId: id } });

  let updatedSubLink = { ...SubLinks, [targetEvent]: links };
  let updatedSubNames = { ...SubNames, [targetEvent]: names };

  await ParEvents.update(
    {
      SubLinks: JSON.stringify(updatedSubLink),
      SubNames: JSON.stringify(updatedSubNames),
      eventInfo: JSON.stringify({ ...JSON.parse(parEvents.eventInfo), [targetEvent]: 0 }),
    },
    { where: { parId: id } }
  );

  res.json({
    succeed: true,
    msg: 'link submit successful',
  });
};

module.exports = {
  sePaticipation,
  teamParticipation,
  paidVerify,
  findTeamInfo,
  changeTransactionId,
  updateProfileInfos,
  editClientImage,
  submitFile,
  clearSubInfos,
  teamParticipationAdmin,
  sePaticipationAdmin,
  submitLink,
  clearEventInfo,
};
