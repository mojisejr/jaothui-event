import { supabase } from "../supabase";

export async function uploadBuffalo(file: File, fileName: string) {
  try {
    const extension = file?.name.split(".")[1];
    const { data, error } = await supabase.storage
      .from("images/buffalos")
      .upload(`${fileName}.${extension}`, file, {
        cacheControl: "0",
        upsert: false,
      });
    console.log(error);

    const url = supabase.storage
      .from("images/buffalos")
      .getPublicUrl(data?.path!).data.publicUrl;

    return url;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function uploadVaccine(file: File, fileName: string) {
  try {
    const extension = file?.name.split(".")[1];
    const { data, error } = await supabase.storage
      .from("images/vaccine")
      .upload(`${fileName}.${extension}`, file, {
        cacheControl: "0",
        upsert: false,
      });

    const url = supabase.storage
      .from("images/vaccine")
      .getPublicUrl(data?.path!).data.publicUrl;

    console.log(error);
    return url;
  } catch (error) {
    console.log(error);
    return null;
  }
}
