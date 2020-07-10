
// TODO: Change the name to something meaningful
export interface Vars {
    oneSignal: {
        userAuthKey: string,
        app: {
            id: string,
            authKey: string,
        }
    },
    captcha: {
        key: string
    },
    hypixel: {
        key: string
    },
    discord: {
        token: string,
        channel: string
    }
}

const vars: Vars = {
    oneSignal: {
        userAuthKey: "",
        app: {
            id: "",
            authKey: ""
        }
    },
    captcha: {
        key: ""
    },
    hypixel: {
        key: ""
    },
    discord: {
        token: "",
        channel: ""
    }
};

export default vars;
