import { Votes } from "~/interfaces/Votes";
import { db } from "../db";
import { VoteEvent } from "~/interfaces/VoteEvent";
import { Voters } from "@prisma/client";
import { TRPCError } from "@trpc/server";

//Create or update event
export async function createVoteEvent(event: VoteEvent) {
  try {
    const upserted = await db.voteEvent.upsert({
      where: {
        id: event.id,
      },
      update: {
        id: event.id,
        name: event.name,
      },
      create: {
        id: event.id,
        name: event.name,
      },
    });

    if (!upserted) {
      return null;
    }
    return upserted;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getVoteEvent() {
  try {
    const event = await db.voteEvent.findMany();
    return event;
  } catch (error) {
    console.log(error);
    return [];
  }
}

//add new Candidate
export async function addNewCandidate(candidate: Votes) {
  try {
    const newCandidate = await db.votes.create({
      data: {
        eventId: candidate.eventId!,
        name: candidate.name,
        imageUrl: candidate.imageUrl,
        microchip: candidate.microchip,
      },
    });

    if (!newCandidate) {
      return null;
    }

    return newCandidate;
  } catch (error) {
    console.log(error);
    return null;
  }
}

//import from registered
export async function importCandidatesFromRegistered(eventId: number) {
  try {
    //get buffalos from event register
    const buffalos = await db.eventRegister.findMany({
      where: {
        eventId: eventId,
      },
    });

    //parsed to votes data
    const parsedBuffalos = buffalos.map((buffalo) => {
      return {
        microchip: buffalo.microchip,
        name: buffalo.name,
        imageUrl: buffalo.imageUrl,
        eventId,
      };
    });

    if (parsedBuffalos.length <= 0) {
      return [];
    }

    //add to votes table
    const imported = await db.votes.createMany({ data: parsedBuffalos });
    return imported;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getCandidates() {
  try {
    const candidates = await db.votes.findMany({ include: { Voters: true } });
    return candidates.map((candidate) => {
      return {
        ...candidate,
        score: candidate.Voters.length,
      };
    });
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function createVoter(voter: Voters) {
  try {
    const createdVoter = await db.voters.create({
      data: voter,
    });

    return createdVoter;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getVoterByUserId(userId: string) {
  try {
    const voter = await db.voters.findFirst({ where: { userId } });
    return voter;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getVotedByuserId(userId: string) {
  const voter = await getVoterByUserId(userId);

  if (!voter) {
    return null;
  }

  const votedCandidate = await db.votes.findFirst({
    where: { id: voter.votesId },
    include: {
      Voters: true,
    },
  });

  const score = votedCandidate?.Voters.length;

  return {
    ...votedCandidate,
    score,
  };
}

export async function voteFor(userId: string, votesId: number) {
  const voted = await db.voters.findFirst({ where: { userId } });

  if (voted) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "โหวตแล้ว" });
  } else {
    const voteFor = await db.voters.create({
      data: {
        userId,
        votesId,
      },
    });

    return voteFor;
  }
}
