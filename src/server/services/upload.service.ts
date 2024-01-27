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

    const url = data
      ? supabase.storage.from("images/buffalos").getPublicUrl(data.path).data
          .publicUrl
      : null;

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

    const url = data
      ? supabase.storage.from("images/vaccine").getPublicUrl(data.path).data
          .publicUrl
      : null;

    console.log(error);
    return url;
  } catch (error) {
    console.log(error);
    return null;
  }
}
