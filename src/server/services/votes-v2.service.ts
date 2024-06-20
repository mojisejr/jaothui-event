import { client } from "../../../sanity/lib/client";
import { groq } from "next-sanity";
import { CanVote } from "~/interfaces/CanVote";
import { CandidateScore } from "~/interfaces/CandidateScore";
import { VoteEvent } from "~/interfaces/VoteEvent";
import { VoteResult } from "~/interfaces/VoteResult";

export const createNewVoteEvent = async (eventName: string) => {
  try {
    const newEventDoc = {
      _type: "voteEvent",
      name: eventName,
      isActive: true,
    };

    const result = await client.create(newEventDoc);

    return result;
  } catch (error) {
    console.log(error);
    return;
  }
};

export const getAllVoteEvents = async () => {
  try {
    const query = groq`*[_type == "voteEvent" && isActive == true]{
    _id,
    name,
    isActive,
    "candidates": candidates[]->{_id, name, microchip, "image": image.asset->url},
    }`;
    const found = await client.fetch<VoteEvent[]>(query);

    return found;
  } catch (error) {
    console.log(error);
    return;
  }
};

export const getEventById = async (eventId: string) => {
  try {
    const queryEvent = groq`*[_type == "voteEvent" && _id == "${eventId}"]{
    _id,
    name,
    isActive,
    "candidates": candidates[]->{_id, name, microchip, "image": image.asset->url}
    }[0]`;

    const event = await client.fetch<VoteEvent>(queryEvent);

    const queryResult = groq`*[_type == "voteResult" && event._ref == "${eventId}"]{
      "candidate": candidate->{_id, microchip},
      "voters": voters[]->{_id},
    }`;

    const results = await client.fetch<CandidateScore[]>(queryResult);

    if (event.candidates != null) {
      const candidatesWithScore = event.candidates.map((candidate) => {
        const score = results.find(
          (result) => result.candidate._id == candidate._id,
        );

        return {
          ...candidate,
          score: score?.voters != null ? score.voters.length : 0,
        };
      });

      return { ...event, candidates: candidatesWithScore };
    }

    return event;
  } catch (error) {
    console.log(error);
    return;
  }
};

export const canVote = async (voterId: string, eventId: string) => {
  const query = groq`*[_type=="voteResult" && event._ref == "${eventId}"]{
    "voter": voters[]{"voted": _id match "${voterId}"}[0],
    "candidateId": candidate->_id
  }[0]`;

  const found = await client.fetch<CanVote>(query);

  if (!found) {
    return {
      canVote: true,
      candidateId: null,
    };
  }

  return {
    canVote: found.voter == null ? true : found.voter.voted,
    candidateId: found.candidateId,
  };
};

export const voteFor = async (
  eventId: string,
  candidateId: string,
  voterId: string,
) => {
  const query = groq`*[_type == "voteResult" && event._ref == "${eventId}" && candidate._ref == "${candidateId}"][0]`;
  const found = await client.fetch<VoteResult>(query);

  console.log(found);

  if (found) {
    const result = await client
      .patch(found._id)
      .setIfMissing({ voters: [] })
      .insert("after", "voters[-1]", [
        { _type: "reference", _ref: voterId, _key: voterId },
      ])
      .commit();

    console.log(result);
    return result;
  } else {
    const newVoteDoc = {
      _type: "voteResult",
      event: {
        _type: "reference",
        _ref: eventId,
      },
      candidate: {
        _type: "reference",
        _ref: candidateId,
      },
      voters: [
        {
          _key: voterId,
          _type: "reference",
          _ref: voterId,
        },
      ],
    };

    return await client.create(newVoteDoc);
  }
};
