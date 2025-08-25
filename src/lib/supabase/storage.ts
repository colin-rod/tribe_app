import { supabase } from './client'

export const uploadMedia = async (file: File, path: string) => {
  const { data, error } = await supabase.storage
    .from('media')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw error
  }

  return data
}

export const getMediaUrl = (path: string) => {
  const { data } = supabase.storage
    .from('media')
    .getPublicUrl(path)

  return data.publicUrl
}

export const deleteMedia = async (path: string) => {
  const { error } = await supabase.storage
    .from('media')
    .remove([path])

  if (error) {
    throw error
  }
}