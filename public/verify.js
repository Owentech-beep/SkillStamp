const form = document.getElementById("verifyForm");
const accessMessage = document.getElementById("accessMessage");
const resultPanel = document.getElementById("verificationResult");

async function verificationRequest(url) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Verification failed.");
    error.status = response.status;
    throw error;
  }

  return data;
}

function showResultMessage(message) {
  resultPanel.replaceChildren();

  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  resultPanel.appendChild(paragraph);
}

function showCredential(credential) {
  resultPanel.replaceChildren();

  const heading = document.createElement("h2");
  heading.textContent = "✓ Credential verified";
  resultPanel.appendChild(heading);

  const fields = [
    ["Holder", credential.holderName],
    ["Challenge", credential.title],
    ["Category", credential.category],
    ["Score", `${credential.score}%`],
    ["Issued", new Date(credential.issuedAt).toLocaleString()],
    ["Issuer", credential.issuer],
    ["Assessment", credential.assessmentType],
    ["Credential ID", credential.credentialId],
  ];

  for (const [label, value] of fields) {
    const paragraph = document.createElement("p");
    paragraph.style.overflowWrap = "anywhere";

    const title = document.createElement("strong");
    title.textContent = `${label}: `;

    paragraph.append(title, document.createTextNode(String(value)));
    resultPanel.appendChild(paragraph);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("credentialId").value.trim();
  if (!id) {
    showResultMessage("Enter a credential ID.");
    return;
  }

  const button = form.querySelector("button");
  button.disabled = true;
  showResultMessage("Checking credential...");

  try {
    const data = await verificationRequest(
      `/api/credentials/${encodeURIComponent(id)}/verify`
    );

    showCredential(data.credential);
  } catch (err) {
    showResultMessage(err.message);

    if (err.status === 401 || err.status === 403) {
      form.hidden = true;
      accessMessage.textContent = "Log in with an employer account to continue.";
    }
  } finally {
    button.disabled = false;
  }
});

async function initialiseVerification() {
  try {
    const { user } = await verificationRequest("/api/auth/me");

    if (user.role !== "employer") {
      accessMessage.textContent =
        "This screen requires an employer account. Student accounts can view their credentials in their portfolio.";
      return;
    }

    accessMessage.textContent = `Signed in as ${user.name}`;
    form.hidden = false;
  } catch (err) {
    accessMessage.textContent =
      err.status === 401
        ? "Please log in with an employer account."
        : `Could not check your account: ${err.message}`;

    if (err.status === 401) {
      const link = document.createElement("a");
      link.href = "login.html";
      link.textContent = " Go to login";
      accessMessage.appendChild(link);
    }
  }
}

initialiseVerification();