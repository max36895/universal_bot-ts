export type TVkPeerId = string|number;
export type TVkDocType = 'doc'|'audio_message'|'graffiti';

export interface IVkUploadFile {
    file?:string;
    photo?:string;
    server:string;
    hash:string;
}
export interface IVkParamsUsersGet {
    user_ids:string[];
    fields:string[];
    name_case:string;
}

export interface IVkParams {
    user_id?:number;
    random_id?:number;
    peer_id?:number;
    domain?:string;
    chat_id?:number;
    user_ids?:number[];
    message?:string;
    lat?:number;
    long?:number;
    attachments?:string[];
    reply_to?: number;
    forward_messages?:number[];
    forward?:string;
    sticker_id?:number;
    group_id?:number;
    keyboard?:string;
    payload?:string;
    dont_parse_links?:boolean;
    disable_mentions?:boolean;
    template?: any;
}

export interface IVkUsersIds {
    peer_id?:number;
    message_id?:number;
    error?:any
}

export interface IVKSendMessage {
    response?: number;
    user_ids?:IVkUsersIds[]
}
export interface IVkUsersGet {
    id:number;
    first_name:string;
    last_name:string;
    deactivated?:string;
    is_closed:boolean;
    can_access_closed:boolean;
}
export interface IVkUploadServer {
    upload_url:string;
    album_id?:string;
    group_id?:string;
}

export interface IVkPhotosSave {
    id:number;
    pid:number;
    aid:number;
    owner_id:number;
    src:string;
    src_big:string;
    src_small:string;
    created:number;
    src_xbig:string;
    src_xxbig:string;
}

interface IVkDocInfo {
    id:number;
    owner_id:number;
}

interface IVkGraffiti extends IVkDocInfo{
    url:string;
    width:number;
    height:number;
}

interface IVkAudioMessage extends IVkDocInfo{
    duration:number;
    waleform:number[];
    link_ogg?:string;
    link_mp3?:string;
}
interface IVkPreview{
    photo?:string[];
    graffiti?:{
        src:string;
        width:number;
        height:number;
    }
    audio_message?:{
        duration:number;
        waleform:number[];
        link_ogg?:string;
        link_mp3?:string;
    }
}
interface IVKDoc extends IVkDocInfo{
    url:string;
    title:string;
    size:number;
    ext:string;
    date:number;
    type:number;
    preview:IVkPreview
}

export interface IVkDocSave extends IVkDocInfo{
    type:TVkDocType;
    graffiti?:IVkGraffiti;
    audio_message?:IVkAudioMessage;
    doc?:IVKDoc;
    id:number;
    url:string;
    width?:number;
    height?:number;
    duration?:number;
    waleform?:number[];
    link_ogg?:string;
    link_mp3?:string;
}
