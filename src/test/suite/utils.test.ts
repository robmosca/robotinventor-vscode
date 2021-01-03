import * as vscode from "vscode";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as chai from "chai";
const chaiMatch = require("chai-match");

import {
  decodeBase64,
  encodeBase64,
  formatFilesize,
  randomId,
  showTemporaryStatusBarMessage,
} from "../../utils";

const mockSetStatusBarMessage = sinon.spy(vscode.window, "setStatusBarMessage");

chai.use(sinonChai);
chai.use(chaiMatch);
const expect = chai.expect;

suite("Utils Test Suite", () => {
  suite("showTemporaryStatusBarMessage", () => {
    test("Shows temporary message in status bar", () => {
      showTemporaryStatusBarMessage("This is a test message");
      expect(mockSetStatusBarMessage).to.have.been.calledWith(
        "This is a test message"
      );
    });
  });

  suite("randomId", () => {
    test("Generates an empty id", () => {
      for (let length = -4; length < 1; ++length) {
        expect(randomId(length)).to.equal("");
      }
    });

    test("Generates a random id", () => {
      for (let length = 1; length < 10; ++length) {
        const randId = randomId(length);
        expect(randId.length).to.equal(length);
        expect(randId).to.match(/^[0-9a-zA-Z]+$/);
      }
    });
  });

  suite("decodeBase64", () => {
    test("Decodes from base64", () => {
      expect(decodeBase64("")).to.equal("");
      expect(decodeBase64("VGhpcyBpcyBhIHRlc3Q=")).to.equal("This is a test");
      expect(
        decodeBase64("VDNzdCB3MXRoIG51bThlcjUgJiBjaDZyYWN0M3JzISE=")
      ).to.equal("T3st w1th num8er5 & ch6ract3rs!!");
    });
  });

  suite("encodeBase64", () => {
    test("Encodes in base64", () => {
      expect(encodeBase64("")).to.equal("");
      expect(encodeBase64("A simple test :)")).to.equal(
        "QSBzaW1wbGUgdGVzdCA6KQ=="
      );
      expect(
        encodeBase64("Hey, what a t3st th1s 1 with num8er5 & ch6ract3rs!!")
      ).to.equal(
        "SGV5LCB3aGF0IGEgdDNzdCB0aDFzIDEgd2l0aCBudW04ZXI1ICYgY2g2cmFjdDNycyEh"
      );
    });
  });

  suite("formatFilesize", () => {
    test("Formats file sizes", () => {
      expect(formatFilesize(0)).to.equal("0 B");
      expect(formatFilesize(54)).to.equal("54 B");
      expect(formatFilesize(1024)).to.equal("1 KB");
      expect(formatFilesize(Math.pow(1024, 2))).to.equal("1 MB");
      expect(formatFilesize(Math.pow(1024, 3))).to.equal("1 GB");
      expect(formatFilesize(Math.pow(1024, 4))).to.equal("1 TB");
      expect(formatFilesize(Math.pow(1024, 5))).to.equal("1 PB");
      expect(formatFilesize(Math.pow(1024, 6))).to.equal("1 EB");
      expect(formatFilesize(Math.pow(1024, 7))).to.equal("1 ZB");
      expect(formatFilesize(Math.pow(1024, 8))).to.equal("1 YB");
    });
  });
});
