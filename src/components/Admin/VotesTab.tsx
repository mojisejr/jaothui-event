import { useRouter } from "next/router";
import { VotesTabMenu } from "./VoteTabMenu";
import { CreateVoteEvent } from "./CreateVoteEvent";
import { NewCandidateForm } from "./AddNewCandidateForm";
import VoteSetting from "./VotesSetting";
import { VotesRewardControl } from "./VoteRewardControl";

export default function VotesTab() {
  const { query } = useRouter();
  const { menu } = query;
  return (
    <div className="flex max-h-screen w-full flex-col gap-2 overflow-y-scroll px-2 text-primary">
      <VotesTabMenu />
      {menu === "newVotes" ? <CreateVoteEvent /> : null}
      {/* {menu === "newCandidate" ? <NewCandidateForm /> : null}
      {menu === "control" ? <VoteSetting /> : null}
      {menu === "reward" ? <VotesRewardControl /> : null} */}
    </div>
  );
}
