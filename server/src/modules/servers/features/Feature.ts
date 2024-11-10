import Server from "../Server.js";

export default abstract class Feature {
    _name: string
    _server: Server
    constructor(name: string, server: Server) {
        this._name = name
        this._server = server
    }

    /**
     * Initalize this feature
     */
    abstract init(): Promise<boolean | void>;

    /**
     * Name of the feature
     *
     * @readonly
     * @memberof Feature
     */
    get Name() {
        return this._name
    }

    /**
     * Is this feature enabled and working?
     *
     * @abstract
     * @type {boolean}
     * @memberof Feature
     */
    abstract available: boolean;
} 