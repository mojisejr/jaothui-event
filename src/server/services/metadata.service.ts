import { viem } from "../blockchain/viem";
import { abi, address } from "../blockchain/metadata/abi";

export interface Metadata {
  name: string;
  origin: string;
  color: string;
  imageUri: string;
  detail: string;
  sex: string;
  birthdate: bigint;
  height: bigint;
  certify: {
    microchip: string;
    certNo: string;
    rarity: string;
    dna: string;
    issuedAt: bigint;
  };
  relation: { motherTokenId: string; fatherTokenId: string };
  createdAt: bigint;
  updatedAt: bigint;
}

export const getMetadataByMicrochipId = async (microchipId: string) => {
  try {
    const data = (await viem.readContract({
      address,
      abi,
      functionName: "getMetadataByMicrochip",
      args: [microchipId],
    })) as Metadata;

    const parsed = {
      ...data!,
      birthdate: +data.birthdate!.toString(),
      height: +data.height.toString(),
      certify: {
        ...data.certify,
        issuedAt: +data.certify.issuedAt.toString(),
      },
      createdAt: +data.createdAt.toString(),
      updatedAt: +data.updatedAt.toString(),
    };

    // console.log(parsed);

    return parsed;
  } catch (error) {
    console.log(error);
  }
};
